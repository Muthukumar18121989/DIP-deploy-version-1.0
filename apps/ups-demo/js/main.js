/**
 * Application entry point — mounts the app shell and routes between screens.
 *
 * Screens are swapped below the header, which is re-rendered per screen so a
 * view can add its own return path. When real routing arrives, `navigate` is
 * the single seam to replace.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  var headerSlot = el('div', { className: 'app-shell__header' });
  var viewport = el('div', { className: 'app-shell__view' });

  // The packet under construction, so a screen can be revisited with its state.
  var current = { packet: null };

  var views = {
    packets: {
      render: function () {
        return DA.pages.AnalyzerPacketsPage({
          rows: DA.data.analyzerPackets,
          currentUser: DA.session.currentUser,
          onNewPacket: function () { navigate('customer-details'); }
        });
      }
    },

    'customer-details': {
      render: function () {
        return DA.pages.CustomerDetailsPage({
          onBack: function () { navigate('packets'); },
          onSourceData: function (input) {
            current.packet = DA.data.buildPacket(input, DA.session.currentUser);
            navigate('create-scenarios', { showSourcingDialog: true });
          }
        });
      }
    },

    'create-scenarios': {
      render: function (params) {
        return DA.pages.CreateScenariosPage({
          packet: current.packet,
          showSourcingDialog: params.showSourcingDialog,
          onBack: function () { navigate('customer-details'); },
          onOpenAccounts: function (bid, scenario) {
            navigate('account-association', { bid: bid, scenario: scenario });
          },
          onProceed: function () { navigate('analyzer-packet'); }
        });
      }
    },

    'analyzer-packet': {
      header: function () {
        return { backLink: { label: 'Back to My Analyzers', onClick: function () { navigate('packets'); } } };
      },
      render: function () {
        return DA.pages.AnalyzerPacketPage({
          packet: current.packet,
          onBack: function () { navigate('create-scenarios'); },
          onExit: function () { navigate('packets'); }
        });
      }
    },

    'account-association': {
      header: function () {
        return { backLink: { label: 'Back to My Analyzers', onClick: function () { navigate('packets'); } } };
      },
      render: function (params) {
        return DA.pages.AccountAssociationPage({
          bid: params.bid,
          scenario: params.scenario,
          packet: current.packet,
          onBack: function () { navigate('create-scenarios'); }
        });
      }
    }
  };

  function navigate(name, params) {
    var view = views[name] || views.packets;
    var header = view.header ? view.header() : {};

    DA.dom.clear(headerSlot).appendChild(
      DA.components.AppHeader({
        productName: 'Digital Analyzer',
        user: DA.session.currentUser,
        backLink: header.backLink
      })
    );

    DA.dom.clear(viewport).appendChild(view.render(params || {}));
    viewport.scrollTop = 0;
    var page = viewport.querySelector('.page');
    if (page) page.scrollTop = 0;
  }

  function mount() {
    var root = document.getElementById('app');
    if (!root) return;

    DA.dom.clear(root).appendChild(
      el('div', { className: 'app-shell' }, [headerSlot, viewport])
    );
    navigate('packets');
  }

  DA.app = { navigate: navigate };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})(window.DA);
