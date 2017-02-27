Feature('My First Test');

Scenario('test something', (I) => {
    I.amOnPage('/tests');
    I.see('abc/4.17.4');
});