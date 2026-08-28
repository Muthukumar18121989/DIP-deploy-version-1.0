/**
 * Builds the packet record the Create Scenarios screen displays from what the
 * Customer Details form captured.
 *
 * Demo stand-in for the create-packet endpoint: the ID continues the existing
 * list, timestamps are taken from the clock, and any field left blank falls
 * back to the reference customer so the walkthrough still reads correctly.
 */
(function (DA) {
  'use strict';

  var FALLBACK = {
    customerName: 'APPLEGATE FARMS',
    referenceNumber: '0000067577'
  };

  function nextPacketId(rows) {
    var highest = (rows || []).reduce(function (max, row) {
      return Math.max(max, Number(row.packetId) || 0);
    }, 0);
    return String(highest + 1);
  }

  DA.data = DA.data || {};

  /**
   * A new scenario copied from an existing one. Shipping profiles carry the
   * scenario index, so a copy into Scenario 1 rewrites S0- profiles as S1-.
   */
  DA.data.copyScenario = function copyScenario(source, index, name, description) {
    var format = DA.format;
    var now = new Date();

    return {
      title: 'Scenario ' + index,
      number: index,
      name: name,
      description: description,
      status: 'Analysis In Progress',
      editable: true,
      expanded: true,
      included: true,
      createdDate: format.formatDate(now),
      lastModified: format.formatDate(now),
      bids: source.bids.map(function (bid) {
        return {
          bidNumber: bid.bidNumber,
          bidName: bid.bidName,
          shippingProfile: bid.shippingProfile.replace(/^S\d+-/, 'S' + index + '-'),
          construct: bid.construct,
          selectable: bid.selectable,
          selected: bid.selected
        };
      })
    };
  };

  DA.data.buildPacket = function buildPacket(input, currentUser) {
    var format = DA.format;
    var now = new Date();
    var timestamp = format.formatTimestamp(now);
    var owner = (currentUser.id ? currentUser.id + ' - ' : '') + currentUser.name;
    var customerName = input.customerName || FALLBACK.customerName;
    var weeks = format.weeksBetween(input.from, input.to);

    return {
      packetId: nextPacketId(DA.data.analyzerPackets),
      customerName: customerName,
      referenceNumber: input.referenceNumber || FALLBACK.referenceNumber,
      description: input.description ||
        customerName + ' Analyzer - ' + format.formatDate(now).replace(/-/g, '/'),
      hierarchy: input.hierarchy,
      industry: '',
      pqr: input.pqr,
      opps: (input.opps || []).join(', '),
      owner: owner,
      lastModifiedBy: owner,
      createdAt: timestamp,
      lastModifiedAt: timestamp,
      from: format.toDashDate(input.from),
      to: format.toDashDate(input.to),
      scenarios: [{
        title: 'Scenario 0',
        number: 0,
        name: 'Current',
        description: (weeks == null ? '' : weeks + ' WEEKS ') + 'UPS SHIPPING PROFILE',
        status: 'Current',
        editable: false,
        expanded: true,
        included: true,
        createdDate: format.formatDate(now),
        lastModified: format.formatDate(now),
        bids: DA.data.scenarioBids.map(function (bid) {
          return {
            bidNumber: bid.bidNumber,
            bidName: bid.bidName,
            shippingProfile: bid.shippingProfile,
            construct: bid.construct,
            selectable: bid.selectable,
            selected: bid.selectable
          };
        })
      }]
    };
  };
})(window.DA);
