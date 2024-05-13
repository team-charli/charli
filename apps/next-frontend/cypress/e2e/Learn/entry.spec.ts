describe('Entry', () => {
  beforeEach(() => {
    cy.clearLocalStorage(); // Clear local storage before each test
    cy.visit('/'); // Visit the home page
  });

  it('should display the IconHeader and BannerHeader components', () => {
    cy.get('IconHeader').should('exist');
    cy.get('BannerHeader').should('exist');
  });

  it('should display the Learn and Teach buttons', () => {
    cy.get('._button-container_').within(() => {
      cy.contains('Learn 🎓').should('exist');
      cy.contains('Teach 🤑').should('exist');
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
