'use strict';
let INFO =xml`
<plugin name='buftabs' version='3.0.2'
  summary='buftabs: show the tabbar in the statusline'
  xmlns='http://vimperator.org/namespaces/liberator'>
<author>s2marine</author>
<license>GPLv3</license>
</plugin>
`;

class Buftab {
    constructor() {
        this.dom = document.createElement('div');
        this.domLabel = document.createElement('label');
        this.domLabel.setAttribute('crop', 'end');
        this.domImage = document.createElement('image');
        this.dom.classList.add('buftab');
        this.dom.appendChild(this.domImage);
        this.dom.appendChild(this.domLabel);
    }
    sync(tab, index) {
        let flag = false;
        if (this.label !== tab.label) {
            flag = true;
            this.label = tab.label;
        }
        if (this.index !== index) {
            flag = true;
            this.index = index;
        }

        if (flag) {
            this.domLabel.setAttribute('value', `${this.index+1}. ${this.label}`);
        }

        if (tab.pinned) {
            !this.dom.classList.contains('pinned') &&
                this.dom.classList.add('pinned');
        } else {
            this.dom.classList.contains('pinned') &&
                this.dom.classList.remove('pinned');
        }

        if (tab.selected) {
            !this.dom.classList.contains('selected') &&
                this.dom.classList.add('selected');
        }
        else if (!tab.selected) {
            this.dom.classList.contains('selected') &&
                this.dom.classList.remove('selected');
        }

        if (this.image !== tab.image) {
            this.image = tab.image;
            this.domImage.setAttribute('src', this.image);
        }
    }
}

class BuftabsBar {
    constructor() {
        this.buftabs = [];
        this.bar = document.createElement('toolbaritem');
        this.bar.setAttribute('id', 'liberator-buftabs-toolbar');
        $('#liberator-statusline').insertBefore(this.bar, $('#liberator-status'));

        gBrowser.tabContainer.addEventListener('TabOpen', event => {
            //console.log('TabOpen', event.target._tPos);
            this.sync(event.target._tPos-1);
        });
        gBrowser.tabContainer.addEventListener('TabSelect', event => {
            //console.log('TabSelect', event.target._tPos);
            let index = event.target._tPos;
            setTimeout(()=>{
                this.sync();
                this.scrollTo(index);
            }, 50);
        });
        gBrowser.tabContainer.addEventListener('TabMove', event => {
            //console.log('TabMove',event.detail, event.target._tPos);
            this.sync(event.detail, event.target._tPos);
        });
        gBrowser.tabContainer.addEventListener('TabClose', event => {
            //console.log('TabClose', event.target._tPos);
            this.sync(event.target._tPos-1);
        });
        gBrowser.tabContainer.addEventListener('TabAttrModified', event => {
            //console.log('TabAttrModified');
            if (event.detail.changed.filter(attr => attr=='image'||attr=='label').length) {
                this.sync(event.target._tPos-1, event.target._tPos);
            }
        });
        gBrowser.tabContainer.addEventListener('TabPinned', event => {
            //console.log('TabPinned');
            this.sync(event.target._tPos-1, event.target._tPos);
        });
        gBrowser.tabContainer.addEventListener('TabUnpinned', event => {
            //console.log('TabUnpinned');
            this.sync(event.target._tPos-1, event.target._tPos);
        });

        this.bar.addEventListener('mousedown', event => {
            let dom = event.target;
            while (!dom.classList.contains('buftab')) {
                dom = dom.parentNode;
            }
            let index = $('#liberator-buftabs-toolbar').childNodes.indexOf(dom);
            if (event.button === 0) {
                gBrowser.selectedTab = gBrowser.visibleTabs[index];
            }
            else if (event.button === 1) {
                gBrowser.removeTab(gBrowser.visibleTabs[index]);
            }
        });

        window.addEventListener('willshowtabview', event => {
            this.buftabs.forEach(b => b.dom.classList.add('hidden'));
        });

        window.addEventListener('willhidetabview', event => {
            this.buftabs.forEach(b => b.dom.classList.remove('hidden'));
        });


        this.cleanFix();
        styles.addSheet(false, 'buftabs', 'chrome://*', this.baseCss);
        $('#liberator-status-location').crop = 'end';
    }

    sync(min=-Infinity, max=Infinity) {
        this.alignDom();
        let _min = Math.min(min, max);
        let _max = Math.max(min, max)+1;
        let len = gBrowser.visibleTabs.length;
        //console.log(_min, _max);
        for (let i=Math.max(0, _min); i<Math.min(len, _max); i++) {
            this.buftabs[i].sync(gBrowser.visibleTabs[i], i);
        }
    }

    alignDom() {
        let len = gBrowser.visibleTabs.length;
        while (this.buftabs.length > len) {
            let removes = this.buftabs.splice(this.buftabs.length-1, 1);
            removes[0].dom.remove();
        }
        while (this.buftabs.length < len) {
            let buftab = new Buftab();
            //console.log(buftab.dom)
            this.bar.insertBefore(buftab.dom, null);
            this.buftabs.splice(this.buftabs.length, 0, buftab);
        }
    }

    scrollTo(index) {
        if (this.buftabs[0] === undefined) { return; }
        let leftLimit = this.bar.getBoundingClientRect().left;
        let rightLimit = this.bar.getBoundingClientRect().right;
        let width = rightLimit - leftLimit;

        let startX = this.buftabs[0].dom.getBoundingClientRect().left;

        let targetBuftabRect = this.buftabs[index].dom.getBoundingClientRect();
        let [left, right] = [targetBuftabRect.left - startX, targetBuftabRect.right - startX];

        debugger;
        if (left + startX < leftLimit) {
            this.bar.scrollTo(left, 0);
        } else if (rightLimit < right + startX) {
            this.bar.scrollTo(right - width, 0);
        }
    }

    get baseCss() {
        let lineHeight = this.bar.scrollHeight;
        let tabWidth = 200;
        return `

        #liberator-statusline {
            position: relative;
            max-height: 24px;
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
            height: 21px;
            margin: 0 2px;
            padding: 0 2px;
            display: flex;
            align-items: center;
            transition: 0.5s left;
        }

        .buftab image {
            flex-shrink: 0;
            max-height: 17px;
            max-width: 17px;
        }

        .buftab.pinned {
            max-width: 21px;
            min-width: 21px;
        }

        .buftab.pinned label {
            display: none;
        }

        .buftab.selected {
            background: #585858;
        }

        .buftab.hidden {
            display: none;
        }

        #liberator-status {
            display: flex;
            align-items: center;
        }

        #liberator-status-location {
            max-width: 250px;
            min-width: 250px;
        }

        #liberator-message-toolbar {
            position: absolute;
            top: 4px;
            z-index: 10;
        }
        `;
    }

    cleanFix() {
        $All('#liberator-statusline > *, #liberator-status > *')
            .filter(_ => _.hasAttribute('flex'))
            .forEach(_ => _.removeAttribute('flex'));
    }
}

let $ = document.querySelector.bind(document);
let $All = document.querySelectorAll.bind(document);
NodeList.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
NodeList.prototype.filter = Array.prototype.filter;
NodeList.prototype.forEach = Array.prototype.forEach;
NodeList.prototype.indexOf = Array.prototype.indexOf;

liberator.buftabs = new BuftabsBar();
