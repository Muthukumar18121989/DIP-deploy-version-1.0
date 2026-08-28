/**
 * Accounts associated with a bid — demo data transcribed from the reference
 * screen, grouped parent > subparent > account.
 *
 * `type` and `associated` drive the counts above the tree, so the tiles stay
 * true to the rows rather than being written down twice.
 */
(function (DA) {
  'use strict';

  DA.data = DA.data || {};

  DA.data.accountTree = [
    {
      label: '0007756010-HORMEL',
      groups: [
        {
          label: 'No Subparent',
          accounts: [
            {
              account: '0000067577-APPLEGATE FARMS',
              adv: '',
              commodityTier: '03',
              associatedBids: 3,
              type: 'ups',
              associated: true
            }
          ]
        }
      ]
    }
  ];

  /** Flattens the tree to the accounts it contains. */
  DA.data.accountsIn = function accountsIn(tree) {
    return (tree || []).reduce(function (accounts, parent) {
      return accounts.concat((parent.groups || []).reduce(function (inner, group) {
        return inner.concat(group.accounts || []);
      }, []));
    }, []);
  };
})(window.DA);
