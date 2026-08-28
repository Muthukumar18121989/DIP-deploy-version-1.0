/**
 * Signed-in user for the demo shell.
 * The header avatar shows these initials; "My Analyzers" scopes the list to
 * packets this person owns. Replace with the real session payload later.
 */
(function (DA) {
  'use strict';

  DA.session = {
    currentUser: {
      id: 'CW000012010',
      name: 'Alagulaxman Alagappan',
      initials: 'AA'
    }
  };
})(window.DA);
