/* global TrelloPowerUp */

var Promise = TrelloPowerUp.Promise;

var SIGMA_ICON = './sigma.svg';

var getBadges = function(t){
  // we used to store costs in a board-level object, but 
  // https://github.com/webrender/trello-costello/issues/11
  // reported that the length of the field could exceed the 
  // 4,000 character limit for trello data.  costs are now stored
  // in card level objects, and this is here to convert old board-
  // level costs to the new card-level objects
  return t.card('id')
  .then(function(card) {
  return t.get('board', 'shared', 'costs')
  .then(function(oldCosts) {
    var returnCosts = function () {
      return t.get('card', 'shared', 'costs')
      .then(function(costs){
        var badges = [];
        if (costs) {
          Object.keys(costs).forEach(function(cost){
            badges.push({
              text: cost + ': ' + parseFloat(costs[cost]).toLocaleString(undefined,{minimumFractionDigits:2}),
              color: (costs[cost] == 0) ? 'red' : null
            });
          });
        }
        return badges;
      });
    }
    
    if (oldCosts && oldCosts[card.id]) {
      return t.set('card', 'shared', 'costs', {'Total Cost': oldCosts[card.id]})
      .then(function() {
        delete oldCosts[card.id];
        return t.set('board', 'shared', 'costs', oldCosts)
        .then(function() {
          return returnCosts();
        });
      })
    } else {
      return returnCosts();
    }
  });
  });
};

var cardButtonCallback = function(t){

  return t.get('card', 'shared', 'costs')
  .then(function(costs){
    return t.popup({
      title: 'Set Cost...',
      items: function(t, options) {
        var newCost = parseFloat(options.search).toFixed(2)
        var buttons = [{
          text: !Number.isNaN(parseFloat(options.search)) ? 'Set Cost to ' + parseFloat(newCost).toLocaleString(undefined,{minimumFractionDigits:2}) : '(Enter a number to set cost.)',
          callback: function(t) {
            if (newCost != 'NaN') {
              var newCosts = costs ? costs : {};
              newCosts['Total Cost'] = newCost;
              t.set('card','shared','costs', newCosts);
            }
            return t.closePopup();
          }
        }];
        if (costs && costs['Total Cost']) {
          buttons.push({
            text: 'Remove cost.',
            callback: function(t) {
              var newCosts = costs;
              delete newCosts['Total Cost'];
              t.set('card','shared','costs', newCosts);
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
};

var boardButtonCallback = function(t,opts) {
  return t.lists('id', 'name')
  .then(function(lists){
  return t.cards('id','name','idList')
  .then(function(cards){
    var getCosts = [];
    cards.forEach(function(card){
      getCosts.push(t.get(card.id, 'shared', 'costs'))
    });
    return Promise.all(getCosts)
    .then(function(costArray) {
      var entries = [];
      var listSums = {};
      var activeIds = cards.map(function(card){return card.id;});
      costArray.forEach(function(cardCosts, idx) {
        if (cardCosts && Object.keys(cardCosts).length > 0) {
          var cost = cards[idx].id;
          if (activeIds.indexOf(cost) > -1) {
            var cb = function(a){t.showCard(a);};
            entries.push({              
                text: parseFloat(cardCosts['Total Cost']).toLocaleString(undefined,{minimumFractionDigits:2}) + ' - ' + cards.find(function(card){return card.id == cost;}).name,
                callback: cb.bind(null, cost)
            });
            if (lists.find(function(list){return cards.find(function(card){return card.id == cost;}).idList == list.id})){
              var thisList = listSums[lists.find(function(list){return cards.find(function(card){return card.id == cost;}).idList == list.id}).name];
              if (!thisList) {
                listSums[lists.find(function(list){return cards.find(function(card){return card.id == cost;}).idList == list.id}).name] = 0;
              }
              listSums[lists.find(function(list){return cards.find(function(card){return card.id == cost;}).idList == list.id}).name] += parseFloat(cardCosts['Total Cost']);
            }
          }
        }
      });
      entries.push({text: '➖➖➖➖➖➖➖➖➖➖➖'});
      entries.push({text: 'SUMMARY BY COLUMN:'});
      for (var listSum in listSums) {        
        entries.push({text: listSum + ': ' + parseFloat(listSums[listSum]).toFixed(2).toLocaleString(undefined,{minimumFractionDigits:2})});
      }
      return t.popup({
        title: 'Cost Summary',
        items: entries
      });
    });
  });
  });
};

TrelloPowerUp.initialize({
  'board-buttons': function(t, options){
    return t.cards('id')
    .then(function(cards) {
      var getCosts = [];
      cards.forEach(function(card){
        getCosts.push(t.get(card.id, 'shared', 'costs'))
      });
      return Promise.all(getCosts)
      .then(function(costArray) {
        var sums = {};
        // for each card
        costArray.forEach(function(cardCosts) {
          // for each cost on the card
          if (cardCosts) {
            Object.keys(cardCosts).forEach(function(cost) {
              // find the sum associated with this cost
              if(sums[cost]) {
                sums[cost] += parseFloat(cardCosts[cost]);
              } else {
                sums[cost] = parseFloat(cardCosts[cost]);
              }
            });
          }
        });
        var boardButtons = [];
        Object.keys(sums).forEach(function(sum) {
          boardButtons.push({
            icon: SIGMA_ICON,
          // parseFloat(costs[cost]).toLocaleString(undefined,{minimumFractionDigits:2})
            
            text: sum + ': ' + parseFloat(sums[sum]).toLocaleString(undefined,{minimumFractionDigits:2}),
            callback: boardButtonCallback
          });
        });
        return boardButtons;
      })
    });
  },
  'card-badges': function(t, options){
    return getBadges(t);
  },
  'card-buttons': function(t, options) {
    return t.get('card', 'shared', 'costs')
    .then(function(costs){
      var buttons = [];  
      buttons.push({
        // its best to use static badges unless you need your badges to refresh
        // you can mix and match between static and dynamic
        icon: SIGMA_ICON, // don't use a colored icon here
        text: costs && costs['Total Cost'] ? 'Cost: ' + parseFloat(costs['Total Cost']).toLocaleString(undefined,{minimumFractionDigits:2}) :'Add Cost...',
        callback: t.memberCanWriteToModel('card') ? cardButtonCallback : null
      });
      return buttons;
    });
  },
});