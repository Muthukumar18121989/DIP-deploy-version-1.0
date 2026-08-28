/**
 * Analyzer packet records — demo data transcribed from the reference screen,
 * in the same order. Replace with the list endpoint response later.
 */
(function (DA) {
  'use strict';

  function packet(id, owner, status, scenarios) {
    return {
      packetId: String(id),
      customerName: 'APPLEGATE FARMS',
      customerNumber: '0000067577',
      owner: owner,
      status: status,
      createdDate: '08/20/2026',
      lastModifiedDate: '08/20/2026',
      scenarios: scenarios,
      customerHierarchy: 'Child'
    };
  }

  DA.data = DA.data || {};

  DA.data.analyzerPackets = [
    packet(112001, 'Soumya Chandran', 'Sourcing Data', 1),
    packet(112000, 'Machavarapu Sai', 'Sourcing Data', 1),
    packet(111999, 'Machavarapu Sai', 'Sourcing Data', 1),
    packet(111998, 'Machavarapu Sai', 'Sourcing Data', 1),
    packet(111996, 'Devesh Tulshyan', 'Sourcing Data', 1),
    packet(111995, 'Venkateshwar Gudla', 'Scenario Setup', 1),
    packet(111994, 'Venkateshwar Gudla', 'Error Occurred', 2),
    packet(111993, 'Machavarapu Sai', 'Scenario Setup', 1),
    packet(111997, 'Devesh Tulshyan', 'Sourcing Data', 1),
    packet(111991, 'Machavarapu Sai', 'Scenario Setup', 1),
    packet(111990, 'Machavarapu Sai', 'Scenario Setup', 1),
    packet(111988, 'Machavarapu Sai', 'Scenario Setup', 1),
    packet(111987, 'Machavarapu Sai', 'Error Occurred', 1),
    packet(111986, 'Machavarapu Sai', 'Scenario Setup', 1),
    packet(111985, 'Machavarapu Sai', 'Scenario Setup', 1)
  ];
})(window.DA);
