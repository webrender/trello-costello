/* global TrelloPowerUp */

var Promise = TrelloPowerUp.Promise;

var SIGMA_ICON = './sigma.svg';

var getBadges = function(t){
  return t.get('board', 'shared', 'costs')
  .then(function(costs){
    return t.card('id')
    .then(function(id) {
      return costs && costs[id.id] ? [{
        text: `Cost: ${costs[id.id]}`,
        color: (costs[id.id] == 0) ? 'red' : null
      }] : [];
    });
  });
};

var cardButtonCallback = function(t){

  return t.get('board', 'shared', 'costs')
  .then(function(costs){
  return t.card('id')
    .then(function(id) {
      return t.popup({
        title: 'Set Cost...',
        items: function(t, options) {
          var newCost = parseFloat(options.search).toFixed(2)
          var buttons = [{
            text: !Number.isNaN(parseFloat(options.search)) ? `Set Cost to ${newCost}` : `(Enter a number to set cost.)`,
            callback: function(t) {
              if (newCost != 'NaN') {
                var newCosts = costs ? costs : {};
                newCosts[id.id] = newCost;
                t.set('board','shared','costs',newCosts);
              }
              return t.closePopup();
            }
          }];
          if (costs && costs[id.id]) {
            buttons.push({
              text: 'Remove cost.',
              callback: function(t) {
                var newCosts = costs ? costs : {};
                delete newCosts[id.id];
                t.set('board','shared','costs',newCosts);
                return t.closePopup();
              }
            });
          }
          return buttons;
        },
        search: {
          placeholder: 'Enter Cost',
          empty: 'Error',
          searching: 'Processing...'
        }
      });
    });
  });

};

TrelloPowerUp.initialize({
  'board-buttons': function(t, options){

    return t.get('board', 'shared', 'costs')
    .then(function(costs){
      var totalCost = 0;
      return t.cards('id').then(cards => {
        var activeIds = cards.map(card => {return card.id;});
        for (var cost in costs) {
          if (activeIds.indexOf(cost) > -1) {
            totalCost = +totalCost + +costs[cost];
          }
        }
        return [{
          icon: SIGMA_ICON,
          text: `Total Cost: ${totalCost.toFixed(2)}`,
        }];
      });
    });
  },
  'card-badges': function(t, options){
    return getBadges(t);
  },
  'card-buttons': function(t, options) {

    return t.get('board', 'shared', 'costs')
    .then(function(costs){
      return t.card('id')
      .then(function(id) {

        return [{
          // its best to use static badges unless you need your badges to refresh
          // you can mix and match between static and dynamic
          icon: SIGMA_ICON, // don't use a colored icon here
          text: costs && costs[id.id] ? `Cost: ${costs[id.id]}` :'Add Cost...',
          callback: cardButtonCallback
        }];

      });
    });
  },
});
