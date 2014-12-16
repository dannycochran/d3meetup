var sigmaGrapher = function () {
  var grapher = {
    initialize: function () {
      this.$el = $('div.network-container');
      this.$header = $('header');

      this.$header.find('button').on('click', this.toggleNetwork.bind(this));
    },

    render: function (data) {
      this.$el.empty();
      this.$header.find('span').html('Network with Sigma.js (' + data.nodes + ' nodes & ' + data.edges + ' links)');
      var i,
          s,
          N = data.nodes,
          E = data.edges,
          g = {
            nodes: [],
            edges: []
          };

      // Generate a random graph:
      for (i = 0; i < N; i++)
        g.nodes.push({
          id: 'n' + i,
          label: 'Node ' + i,
          x: Math.random(),
          y: Math.random(),
          size: Math.random(),
          color: '#666'
        });

      for (i = 0; i < E; i++)
        g.edges.push({
          id: 'e' + i,
          source: 'n' + (Math.random() * N | 0),
          target: 'n' + (Math.random() * N | 0),
          size: Math.random(),
          color: '#ccc'
        });
      sigma.renderers.def = sigma.renderers.webgl;
      // Instantiate sigma:
      s = new sigma({
        graph: g,
        container: this.$el.get(0),
        type: 'webgl'
      });

      return this;
    },

    toggleNetwork: function (e) {
      var networkData = $(e.currentTarget).attr('id') === 'small' ? {nodes:100, edges: 1000} : {nodes:5000, edges: 32000};
      this.render(networkData);
    },
  };
  grapher.initialize();
  return grapher;
};

$(document).ready(function () {
  var grapher = new sigmaGrapher();
  grapher.render({nodes:100, edges: 1000});
});