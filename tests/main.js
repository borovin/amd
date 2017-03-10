Feature('Minimal amd loader');

Scenario('All modules should be loaded on the page', (I) => {
    I.amOnPage('/');
    I.see('abcd');
});