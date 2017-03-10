(function(global) {
    const modules = [];
    const registry = {};
    const config = {
        baseUrl: '/'
    };
    const __module = {exports: {}};

    function define(name, dependencies, definition) {
        if (typeof name !== 'string') {
            definition = dependencies;
            dependencies = name;
        }

        if (!Array.isArray(dependencies)) {
            definition = dependencies;
            dependencies = [];
        }

        modules.push({dependencies, definition})
    }

    function loadModule(moduleUrl) {
        getNestedDependencies(moduleUrl).forEach(loadModule);

        if (registry[moduleUrl]) {
            return registry[moduleUrl];
        }

        let definition;
        let directDependencies;

        registry[moduleUrl] = loadScript(moduleUrl)
            .then(module => {
                definition = module.definition;
                directDependencies = module.dependencies;

                return Promise.all(directDependencies.map(dependencyId => {
                    if (dependencyId === 'module'){
                        return __module;
                    }

                    if (dependencyId === 'exports'){
                        return __module.exports;
                    }

                    return loadModule(getDependencyUrl(moduleUrl, dependencyId));
                }));
            })
            .then(dependencies => {
                let result = typeof definition === 'function' ? definition(...dependencies) : definition;

                if (directDependencies[0] === 'module' || directDependencies[0] === 'exports'){
                    result = __module.exports;
                }

                __module.exports = {};

                return result;
            });

        return registry[moduleUrl];
    }

    function loadScript(url) {
        return new Promise((resolve, reject) => {
            let ready = false;
            const scriptElement = document.createElement("script");

            scriptElement.type = "text/javascript";
            scriptElement.src = config.baseUrl + url;
            scriptElement.async = true;
            scriptElement.onload = scriptElement.onreadystatechange = function() {
                if (!ready && (!this.readyState || this.readyState == "complete")) {
                    ready = true;
                    resolve(modules.pop());
                }
            };
            scriptElement.onerror = scriptElement.onabort = reject;
            document.head.appendChild(scriptElement);
        });
    }

    function getNestedDependencies(moduleUrl) {
        if (!config.tree[moduleUrl]) {
            return [];
        }

        let nestedDependencies = Object.keys(config.tree[moduleUrl]).map(dependencyId => config.tree[moduleUrl][dependencyId]);

        for (let depId in config.tree[moduleUrl]) {
            nestedDependencies = nestedDependencies.concat(getNestedDependencies(config.tree[moduleUrl][depId]));
        }

        return nestedDependencies;
    }

    function getDependencyUrl(parentModuleUrl, dependencyId) {
        if (!config.tree[parentModuleUrl]) {
            return dependencyId;
        }

        return config.tree[parentModuleUrl][dependencyId] || dependencyId;
    }

    function configure(options) {
        Object.assign(config, options);
    }

    global.amd = {
        import: loadModule,
        config: configure
    };

    global.define = define;
    global.define.amd = {};
})(window);