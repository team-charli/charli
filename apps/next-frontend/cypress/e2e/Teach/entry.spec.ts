describe('Entry', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/');
  });



});
describe('Entry', () => {
  beforeEach(() => {
    cy.clearLocalStorage(); // Clear local storage before each test
    cy.visit('/'); // Visit the home page
  });

  it('should display the icon header and banner header', () => {
    cy.get('[data-testid="icon-header"]').should('exist');
    cy.get('[data-testid="banner-header"]').should('exist');
  });

  it('should display the Learn and Teach buttons', () => {
    cy.get('._button-container_').within(() => {
      cy.get('[data-cy="learn-button"]').should('exist');
      cy.get('[data-cy="teach-button"]').should('exist');
    });
  });

  it('should navigate to the login page when clicking the Learn button', () => {
    cy.contains('Learn 🎓').click();
    cy.url().should('include', '/login');
  });

  it('should navigate to the login page when clicking the Teach button', () => {
    cy.contains('Teach 🤑').click();
    cy.url().should('include', '/login');
  });
});
