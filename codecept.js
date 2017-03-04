module.exports.config = {
    "tests": "tests/*.js",
    "timeout": 10000,
    "output": "./output",
    "helpers": {
        "Nightmare": {
            "url": "http://localhost:3000",
            "show": true
        }
    },
    "include": {},
    "bootstrap": false,
    "mocha": {},
    "name": "amd"
};