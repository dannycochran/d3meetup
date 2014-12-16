var sigmaGrapher = function () {
  var grapher = {
    colors: ['#d73027', '#f46d43', '#fdae61', '#fee090', '#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#FFFFFF'],
    initialize: function () {
      this.$el = $('div.network-container');
      this.$header = $('header');

      this.$header.find('button').on('click', this.toggleNetwork.bind(this));
    },

    render: function (data) {
      this.data = data;
      this.$el.empty();
      this.$header.find('span').html('Network with Sigma.js (' + data.nodes.length + ' nodes & ' + data.links.length + ' links)');
      
      // modify data to have a radius
      _.each(data.nodes, function (n, i) {
        n.size = 1 + n.row_ids.length;
      });

      // create edges
      data.edges = data.links;
      _.each(data.edges, function (e, i) {
        e.id = i.toString(10);
        e.source = e.from.toString(10);
        e.target = e.to.toString(10);
        e.color = '#ccc';
      });

      this.updateColorings();

      sigma.renderers.def = sigma.renderers.webgl;
      // Instantiate sigma:
      s = new sigma({
        graph: data,
        container: this.$el.get(0),
        type: 'webgl',
        settings: {
          drawLabels: false
        }
      });

      return this;
    },

    updateColorings: function () { // random colors
      _.each(this.data.nodes, function (n) {
        n.color = this.colors[Math.floor(Math.random() * 8)];
      }.bind(this));
    },

    toggleNetwork: function (e) {
      var networkData = $(e.currentTarget).attr('id') === 'small' ? smallNetwork : largeNetwork;
      this.render(networkData);
    },
  };
  grapher.initialize();
  return grapher;
};

$(document).ready(function () {
  var grapher = new sigmaGrapher();
  grapher.render(smallNetwork);
});