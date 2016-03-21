let INFO =xml`
<plugin name="buftabs" version="2.0.0"
  summary="buftabs: show the tabbar in the statusline"
  xmlns="http://vimperator.org/namespaces/liberator">
<author>s2marine</author>
<license>GPLv3</license>
</plugin>
`;
'use strict';

class Buftab {
  constructor(tab) {
    console.log('new Buftab');
    this.tab = tab;
    this.dom = document.createElement('div');
    this.domLabel = document.createElement('label');
    this.domLabel.setAttribute('crop', 'end');
    this.domImage = document.createElement('image');
    this.dom.classList.add('buftab');
    this.refresh();
    this.dom.appendChild(this.domImage);
    this.dom.appendChild(this.domLabel);
  }

  refresh() {
    console.log('refresh');
    console.log('oldValue', this.index, this.label, this.selected, this.image);
    console.log('newValue', this.tab._tPos, this.tab.label, this.tab.selected, this.tab.image);
    let flag = false;
    if (this.index !== this.tab._tPos) {
      flag = true;
      this.index = this.tab._tPos;
      this.dom.index = this.tab._tPos;
    }
    if (this.label !== this.tab.label) {
      flag = true;
      this.label = this.tab.label;
    }
    if (flag) {
      this.domLabel.setAttribute('value', `${this.index+1} ${this.label}`);
    }
    if (this.selected !== this.tab.selected) {
      this.selected = this.tab.selected;
      if (this.tab.selected) {
        this.dom.classList.add('selected');
      } else {
        this.dom.classList.remove('selected');
      }
    }
    if (this.image !== this.tab.image) {
      this.image = this.tab.image;
      this.domImage.setAttribute('src', this.image);
    }
  }

  getValue() {
    return {
      index,
      title,
      imageUrl,
      selected,
      tab
    };
  }
}

class BuftabsBar {

  tabOpen(tab) {
    console.log('tabOpen');
    let buftab = new Buftab(tab);
    this.buftabs.splice(buftab.index, 0, buftab);
    this.observer.observe(tab, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['label', 'image']
    });
    buftab.refresh();
    this.bar.insertBefore(buftab.dom, this.bar.childNodes[buftab.index]);
    this.buftabs.filter(t => t.index > buftab.index)
      .forEach(t => {
        t.index += 1;
        t.refresh();
      });
  };


  tabSelect(index, removeing) {
    console.log('tabSelect', index);
    if (this.buftabs[this.selected]) {
      this.buftabs[this.selected].refresh();
    }
    this.selected = index - removeing.filter(t => t._tPos <= index).length;
    this.buftabs[this.selected].refresh();
  };

  tabMove(from, to) {
    console.log('tabMove', from, to);
    let tmpTab = this.buftabs[from].tab;
    if (to < from) {
      for(let i=from; i>to; i--) {
        this.buftabs[i].tab = this.buftabs[i-1].tab;
      }
    }
    else {
      for(let i=from; i<to; i++) {
        this.buftabs[i].tab = this.buftabs[i+1].tab;
      }
    }
    this.buftabs[to].tab =  tmpTab;
    this.buftabs.filter(t => Math.min(from, to) <= t.index <= Math.max(from, to))
      .forEach(t => {
        t.refresh();
        if (t.selected) {
          this.selected = t.index;
        }
      });
  };

  tabClose(tab) {
    console.log('tabClose', tab._tPos);
    let index = tab._tPos;
    let removes = this.buftabs.splice(index, 1);
    removes[0].dom.remove();
    if (this.selected > index) {
      this.selected -= 1;
    }
    setTimeout(()=>{
    this.buftabs.filter(t => t.index > index)
      .forEach(t => t.refresh());
    }, 50);
  };

  handleDomChange(records) {
    console.log('Change', records);
    records.filter(r => r.type === 'attributes').map(r => r.target)
      .forEach(t => this.buftabs[t._tPos].refresh());
  };

  get baseCss() {
    let lineHeight = this.bar.scrollHeight;
    let tabWidth = 200;
    return `

      #liberator-statusline {
        display: flex;
        align-items: center;
      }

      #liberator-buftabs-toolbar {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        flex-grow: 10000;
        overflow-x: hidden;
        position: relative;
      }

      .buftab {
        background: #D8D8D8;
        max-width: ${tabWidth}px;
        min-width: ${tabWidth/5*3}px;
        width: 100%;
        margin: 0 2px;
        padding: 0 2px;
        display: flex;
        align-items: center;
        transition: 0.5s left;
      }

      .buftab image {
        flex-shrink: 0;
        max-height: ${lineHeight-4}px;
        max-width: ${lineHeight-4}px;
      }

      .buftab.selected {
        background: #585858;
      }

      #liberator-status {
        display: flex;
        align-items: center;
      }

      #liberator-status-location {
        max-width: 250px;
        min-width: 250px;
      }
      `;
  }

  cleanFix() {
    $All('#liberator-statusline > *, #liberator-status > *')
      .filter(_ => _.hasAttribute('flex'))
      .forEach(_ => _.removeAttribute('flex'));
  }

  constructor() {
    this.buftabs = [];
    this.selected = undefined;
    this.bar = document.createElement('toolbaritem');
    this.bar.setAttribute('id', 'liberator-buftabs-toolbar');
    $('#liberator-statusline').insertBefore(this.bar, $('#liberator-status'));

    this.observer = new window.MutationObserver(this.handleDomChange.bind(this));
    for (let tab of $All('tab')) {
      this.tabOpen(tab);
      if (tab.selected) {
        this.selected = tab._tPos;
      }
    }

    gBrowser.tabContainer.addEventListener("TabOpen", event => {
      this.tabOpen(event.target);
    });
    gBrowser.tabContainer.addEventListener("TabSelect", event => {
      this.tabSelect(event.target._tPos, gBrowser._removingTabs);
    });
    gBrowser.tabContainer.addEventListener("TabMove", event => {
      this.tabMove(event.detail, event.target._tPos);
    });
    gBrowser.tabContainer.addEventListener("TabClose", event => {
      this.tabClose(event.target);
    });

    this.bar.addEventListener('mousedown', event => {
      console.log('click');
      let dom = event.target;
      while (!dom.classList.contains('buftab')) {
        dom = dom.parentNode;
      }
      console.log(dom);
      let index = dom.index;
      if (event.button === 0) {
        gBrowser.selectTabAtIndex(index);
      }
      else if (event.button === 1) {
        gBrowser.removeTab(gBrowser.tabs[index]);
      }
    });

    this.cleanFix();
    styles.addSheet(false, 'buftabs', 'chrome://*', this.baseCss);
    $('#liberator-status-location').crop = 'end';
  };
}

let $ = document.querySelector.bind(document);
let $All = document.querySelectorAll.bind(document);
NodeList.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
NodeList.prototype.filter = Array.prototype.filter;

liberator.buftabs = new BuftabsBar();

// vim:sw=2 ts=2 et si fdm=marker:
