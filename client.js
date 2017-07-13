/* global TrelloPowerUp */

var Promise = TrelloPowerUp.Promise;

var SIGMA_ICON = 'https://cdn.glitch.com/380a7bed-fba7-4128-9418-b75f0d1d7492%2Fsigma_final.svg?1495405328591';

var getBadges = function(t){
  return t.get('board', 'shared', 'costs')
  .then(function(costs){
    return t.card('id')
    .then(function(id) {
      return costs && costs[id.id] ? [{
        // its best to use static badges unless you need your badges to refresh
        // you can mix and match between static and dynamic
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
          return [
            {
              text: !Number.isNaN(parseFloat(options.search)) ? `Set Cost to ${newCost}` : `(Enter a number to set cost.)`,
              callback: function(t) {
                if (newCost != 'NaN') {
                  var newCosts = costs ? costs : {};
                  newCosts[id.id] = newCost;
                  t.set('board','shared','costs',newCosts);
                }
                return t.closePopup();
              }
            }
          ];
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
      for (var cost in costs) {
        totalCost = +totalCost + +costs[cost];
      }
      return [{
        // we can either provide a button that has a callback function
        // that callback function should probably open a popup, overlay, or boardBar
        icon: SIGMA_ICON,
        text: `Total Cost: ${totalCost.toFixed(2)}`,
      }];
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
    
    return t.get('board', 'shared', 'cost')
    .then(function(cost){
      console.log(cost[t.card('id')]);

      
    });
  },
});