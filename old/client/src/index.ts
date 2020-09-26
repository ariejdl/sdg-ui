
//import { Terminal } from 'xterm';

import { _SceneWidget } from './scene';

import { DockPanel } from '@lumino/widgets';
import { Widget } from '@lumino/widgets';

import './base.scss';
import '@lumino/widgets/style/index.css';

import './panel.scss';

// TODO: remove
function createContent(title: string): Widget {
  var widget = new Widget();
  widget.addClass('content');
  widget.addClass(title.toLowerCase());

  widget.title.label = title;
  widget.title.closable = true;

  return widget;
}

document.addEventListener('DOMContentLoaded', function() {

  // https://github.com/jupyterlab/lumino/tree/master/packages/widgets
  var panel = new DockPanel({ spacing: 0 });

  // N.B. adding scene causes tabs to slow down....

  let scene = new _SceneWidget();

  //let scene = createContent('x');
  scene.title.label = "System";
  scene.title.closable = true;



  var w1 = createContent('Red');
  var w2 = createContent('Green');
  var w3 = createContent('Blue');

  panel.addWidget(scene);
  panel.addWidget(w2);
  panel.addWidget(w1);
  panel.addWidget(w3, { mode: 'split-right', ref: w2 });
  //panel.addWidget(scene2, { mode: 'split-right', ref: w2 });

  panel.id = 'base';

  panel.activate();

  panel.show();

  Widget.attach(panel, document.body);

  window.onresize = () => { panel.update() };

});
