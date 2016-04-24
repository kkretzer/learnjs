'use strict';

var learnjs = {};

learnjs.problems = [
  {
    description: "What is truth?",
    code: "function problem() { return __; }"
  },
  {
    description: "Simple Math",
    code: "function problem() { return 42 === 6 * __; }"
  }
  ,{
    description: "Array Indexing",
    code: "function problem() {\n" +
    "  var a = ['foo', 'bar'];\n" +
    "  return a[__] === 'bar';\n}"
  }
  ,{
    description: "How many?",
    code: "function problem() {\n" +
    "  var a = ['foo', 'bar'];\n" +
    "  return a.__ === 2;\n}"
  }
  ,{
    description: "Make it bigger",
    code: "function problem() {\n" +
    "  var a = ['foo', 'bar'];\n" +
    "  a.__;\n" +
    "  return a[2] === 'a third item';\n}"
  }
  ,{
    description: "Functions",
    code: "function problem() {\n" +
    "  var f = __;\n" +
    "  return f();\n}"
  }
];

learnjs.showView = function(hash) {
  var routes = {
    '#problem': learnjs.problemView,
    '#': learnjs.landingView,
    '': learnjs.landingView
  };
  var hashParts = hash.split('-');
  var viewFn = routes[hashParts[0]];
  if (viewFn) {
    learnjs.triggerEvent('removingView', []);
    $('.view-container').empty().append(viewFn(hashParts[1]));
  }
};

learnjs.landingView = function() {
  return learnjs.template('landing-view');
}

learnjs.template = function(name) {
  return $('.templates .' + name).clone();
};

learnjs.problemView = function(data) {
  var problemNumber = parseInt(data, 10);
  var view = learnjs.template('problem-view');
  var problemData = learnjs.problems[problemNumber - 1];
  var resultFlash = view.find('.result');
  
  function checkAnswer() {
    var answer = view.find('.answer').val();
    var test = problemData.code.replace('__', answer) + '; problem();';
    return eval(test);
  }

  function checkAnswerClick() {
    if (checkAnswer()) {
      var correctFlash = learnjs.buildCorrectFlash(problemNumber);
      learnjs.flashElement(resultFlash, correctFlash);
    } else {
      learnjs.flashElement(resultFlash, 'Incorrect!');
    }
    return false;
  }

  view.find('.check-btn').click(checkAnswerClick);
  view.find('.title').text('Problem #' + problemNumber);
  learnjs.applyObject(problemData, view);

  if (problemNumber < learnjs.problems.length) {
    var buttonItem = learnjs.template('skip-btn');
    buttonItem.find('a').attr('href', '#problem-' + (problemNumber + 1));
    $('.nav-list').append(buttonItem);
    view.bind('removingView', function() {
      buttonItem.remove();
    });
  }

  return view;
};

learnjs.buildCorrectFlash = function (problemNum) {
  var correctFlash = learnjs.template('correct-flash');
  var link = correctFlash.find('a');
  if (problemNum < learnjs.problems.length) {
    link.attr('href', '#problem-' + (problemNum + 1));
  } else {
    link.attr('href', '');
    link.text("You're Finished!");
  }
  return correctFlash;
};

learnjs.appOnReady = function() {
  window.onhashchange = function() {
    learnjs.showView(window.location.hash);
  };
  learnjs.showView(window.location.hash);
};

learnjs.applyObject = function(obj, elem) {
  for (var key in obj) {
    elem.find('[data-name="' + key + '"]').text(obj[key]);
  }
};

learnjs.flashElement = function(elem, content) {
  elem.fadeOut('fast', function() {
    elem.html(content);
    elem.fadeIn();
  });
};

learnjs.triggerEvent = function(name, args) {
  $('.view-container>*').trigger(name, args);
}
