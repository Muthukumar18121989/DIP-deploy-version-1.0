/**
 * Bids sourced for a scenario — demo data transcribed from the reference
 * screen. Non-incented revenue is always included, so it carries no checkbox.
 */
(function (DA) {
  'use strict';

  DA.data = DA.data || {};

  DA.data.scenarioBids = [
    {
      bidNumber: 'P200040799',
      bidName: 'Hormel 2024',
      shippingProfile: 'S0-UPS-PLD-1',
      construct: 'Daily',
      selectable: true
    },
    {
      bidNumber: 'P200040911',
      bidName: 'Hormel Foods Corporation Def',
      shippingProfile: 'S0-UPS-PLD-2',
      construct: 'Daily',
      selectable: true
    },
    {
      bidNumber: 'P580040974',
      bidName: 'UPSC|FLEX|.90|2.70||AJG 2',
      shippingProfile: 'S0-UPS-PLD-3',
      construct: 'Daily',
      selectable: true
    },
    {
      bidNumber: '9999999999',
      bidName: 'Non-incented Revenue',
      shippingProfile: 'UPS-PLD',
      construct: 'Daily',
      selectable: false
    }
  ];
})(window.DA);
