$(document).ready(function(){init();});

////////////////////////////////////////////////

var chance = new Chance();

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
  });
};

function init() {
 $('#population-size').slider(state.populationSize);
 $('#number-of-generations').slider(state.numberOfGenerations);
 $('#heritability').slider(state.heritability);
 $('#polygenaity').slider(state.polygenaity);
 $('#assortative-mating').slider(state.assortativeMating);
 $('#fecundity').slider(state.fecundity);

 $('button').on('click', calculate);
}

function LastNameColors(generations) {
  var names = {}
  for (var i = 0; i < generations.length; i++) {
    for (var j = 0; j < generations[i].length; j++) {
      names[generations[i][j].lastName] = true;
    }
  }

  var step = 1 / (Object.keys(names).length);
  var hue = 0;
  for (var key in names) {
    hue += step;
    names[key] = hsl2rgb(hue, 0.77, 0.5);
  };
  return names;
}

function hsl2rgb(h, s, l){
  var r, g, b;

  if(s == 0){
      r = g = b = l; // achromatic
  }else{
      var hue2rgb = function hue2rgb(p, q, t){
          if(t < 0) t += 1;
          if(t > 1) t -= 1;
          if(t < 1/6) return p + (q - p) * 6 * t;
          if(t < 1/2) return q;
          if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
      }

      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
  }

  return 'rgb(' + ([Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]).join(',') + ')';
}


function renderChart(generations) {
  $('#chart').empty();
  var graph = {nodes: [], edges: []};

  for (var x = 0; x < generations.length; x++) {
    for (var y = 0; y < generations[x].length; y++) {
      var node = generations[x][y];
      graph.nodes.push({
        id: node.id,
        label: node.firstName + ' ' + node.lastName + ': ' + node.phenotype,
        x: 1 + x * 50,
        y: 400 * (1 - node.phenotype),
        size: node.phenotype,
        color: hsl2rgb(node.phenotype, 0.7, 0.5)
      });

      if (node.children && node.children.length) {
        for (var i = 0; i < node.children.length; i++) {
          graph.edges.push({
            id: node.id + ':' + node.children[i].id,
            source: node.id,
            target: node.children[i].id,
            size: 1,
            color: hsl2rgb(node.hue, 0.7, 0.2)
          });
        }
      }
    }
  }

  var s = new sigma({
    container: 'chart',
    graph: graph
  });

  s.settings({
    drawLabels: false
  });

  s.bind('clickNode', function() {
    console.log('click', arguments);
  });

  s.refresh();

  return s;
};

window.state = {
  populationSize: {min:2, max: 200, value: 20},
  numberOfGenerations: {min:10, max: 50, value: 20},
  polygenaity: {min:1, max:100, value:8},
  heritability: {min:0, max:100, value:80},
  assortativeMating: {min:0, max:100, value:90},
  fecundity: {min:0, max:200, value:100}
}

state.populationSize.slide = function(event, ui) {
  state.populationSize.value = ui.value;
  $("#population-size-title").text("Population Size: " + ui.value);
};


state.fecundity.slide = function(event, ui) {
  state.fecundity.value = ui.value;
  var value = 0.01 * (ui.value - 100);
  $("#fecundity-title").text("Fecundity: " + value);
};


state.numberOfGenerations.slide = function(event, ui) {
  state.numberOfGenerations.value = ui.value;
  $("#number-of-generations-title").text("Number of Generations: " + ui.value);
};


state.heritability.slide = function(event, ui) {
  state.heritability.value = ui.value;
  $("#heritability-title").text("Heritability: " + ui.value + "%");
};


state.assortativeMating.slide = function(event, ui) {
  state.assortativeMating.value = ui.value;
  var coefficient = ("" + ((ui.value * 0.02) - 1)).slice(0, 6);
  $("#assortative-mating-title").text("Assortative Mating: " + coefficient);
};


state.polygenaity.slide = function(event, ui) {
  state.polygenaity.value = ui.value;
  var value = ("" + (100 / ui.value)).slice(0, 6);
  var message = "Polygenaity: " + ui.value + " genes involved "
  message += "with an average importance of " + value + "% each";
  $("#polygenaity-title").text(message);
};

function breed(a, b) {
  var x = Organism();
  x.genes = [];
  x.mother = a;
  x.father = b;
  x.hue = (x.father.hue + x.mother.hue) / 2;
  // PATRIARCHY!
  x.lastName = b.lastName;
  a.children.push(x);
  b.children.push(x);
  a.partner = b;
  b.partner = a;
  for (var i = 0; i < a.genes.length; i++) {
    var gene = Math.random() > 0.5 ? a.genes[i] : b.genes[i];
    x.phenotype += gene;
    x.genes.push(gene);
  }
  x.phenotype /= state.polygenaity.value;
  // the heritability stuff, because the slider only deals with ints
  var h = 0.01 * state.heritability.value;
  x.phenotype = (h * x.phenotype) + ((1 - h) * Math.random());
  return x;
};

function selectMateAndBreed(organisms, colorize) {
  organisms.sort((a, b) => a.phenotype - b.phenotype);
  //organisms.reverse();
  var a = [];
  var b = [];
  var nextGeneration = [];
  for (var i = 0; i < organisms.length; i++) {
    i % 2 === 0 ? b.push(organisms[i]) : a.push(organisms[i]); 
  };

  while (a.length && b.length) {
    var aM = 1 - (0.01 * state.assortativeMating.value);
    var index = Math.min(b.length - 1, Math.floor(b.length * aM));
    nextGeneration.push(breed(a[0], b[index]));
    nextGeneration.push(breed(a[0], b[index]));
    // This is the fecundity stuff, maybe come back to it later...
    /*
    var f = 0.02 * (state.fecundity.value * (a[0].phenotype + b[index].phenotype)) | 0;
    console.log('f: ', f);
    for (var i = 0; i < f; i++) {
      nextGeneration.push(breed(a[0], b[index]));
    }
    */
    a.shift();
    b.splice(index, 1);
  }

  return nextGeneration;
};

function Organism() {
  var x = {
    phenotype: 0,
    id: uuid(),
    mother: null,
    father: null,
    partner: null,
    children: [],
    hue: Math.random(),
    genes: [],
    firstName: chance.first(),
    lastName: chance.last(),
  };
  for (var i = 0; i < state.polygenaity.value; i++) {
    var gene = Math.random();
    x.genes.push(gene);
    x.phenotype += gene;
  }

  x.phenotype /= state.polygenaity.value;

  return x;
}

function calculate() {
  var populationSize = state.populationSize.value;
  var numberOfGenerations = state.numberOfGenerations.value;
  var generations = [];
  var currentGeneration = [];
  for (var i = 0; i < populationSize; i++) {
    currentGeneration.push(Organism());
  }
  currentGeneration.sort((a, b) => a.phenotype - b.phenotype);
  //currentGeneration.reverse();
  var hue = 0;
  for (var i = 0; i < currentGeneration.length; i++) {
    hue += 1 / populationSize;
    currentGeneration[i].hue = hue;
  }


  generations.push(currentGeneration);
  for (var i = 0; i < numberOfGenerations; i++) {
    currentGeneration = selectMateAndBreed(currentGeneration);
    currentGeneration.sort((a, b) => a.phenotype - b.phenotype);
    //currentGeneration.reverse();
    generations.push(currentGeneration);
  }

  renderChart(generations);

};

