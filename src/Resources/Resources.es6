import Tool from '../DevTools/Tool.es6'
import util from '../lib/util'

require('./Resources.scss');

export default class Resources extends Tool
{
    constructor()
    {
        super();
        this.name = 'resources';
        this._localStoreData = [];
        this._cookieData = [];
        this._scriptData = [];
        this._stylesheetData = [];
        this._imageData = [];
        this._tpl = require('./Resources.hbs');
    }
    init($el, parent)
    {
        super.init($el);

        this._parent = parent;

        this.refresh();
        this._bindEvent();
    }
    refresh()
    {
        return this.refreshLocalStorage()
                   .refreshCookie()
                   .refreshScript()
                   .refreshStylesheet()
                   .refreshImage()._render();
    }
    refreshScript()
    {
        var scriptData = [];

        util.$('script').each(function ()
        {
            var src = this.src;

            if (src !== '') scriptData.push(src);
        });

        scriptData = util.unique(scriptData);

        this._scriptData = scriptData;

        return this;
    }
    refreshStylesheet()
    {
        var stylesheetData = [];

        util.$('link').each(function ()
        {
            if (this.rel !== 'stylesheet') return;

            stylesheetData.push(this.href);
        });

        stylesheetData = util.unique(stylesheetData);

        this._stylesheetData = stylesheetData;

        return this;
    }
    refreshLocalStorage()
    {
        var localStoreData = [];

        // Mobile safari is not able to loop through localStorage directly.
        var localStore = JSON.parse(JSON.stringify(window.localStorage));

        util.each(localStore, function (val, key)
        {
            localStoreData.push({
                key: key,
                val: val.slice(0, 500)
            });
        });

        this._localStoreData = localStoreData;

        return this;
    }
    refreshCookie()
    {
        var cookieData = [];

        var cookie = document.cookie;
        if (util.trim(cookie) !== '')
        {
            util.each(document.cookie.split(';'), function (val)
            {
                val = val.split('=');
                cookieData.push({
                    key: util.trim(val[0]),
                    val: decodeURIComponent(val[1])
                });
            });
        }

        this._cookieData = cookieData;

        return this;
    }
    refreshImage()
    {
        var imageData = [];

        util.$('img').each(function ()
        {
            var $this = util.$(this),
                src = $this.attr('src');

            if ($this.data('exclude') === 'true') return;

            imageData.push(src);
        });

        imageData = util.unique(imageData);

        this._imageData = imageData;

        return this;
    }
    show()
    {
        super.show();

        return this.refresh();
    }
    _bindEvent()
    {
        var self = this;

        var parent = this._parent;

        this._$el.on('click', '.refresh-local-storage', () =>
        {
            this.refreshLocalStorage()._render();
        }).on('click', '.refresh-cookie', () =>
        {
            this.refreshCookie()._render();
        }).on('click', '.refresh-script', () =>
        {
            this.refreshScript()._render();
        }).on('click', '.refresh-image', () =>
        {
            this.refreshImage()._render();
        }).on('click', '.delete-local-storage', function ()
        {
            var key = util.$(this).data('key');

            localStorage.removeItem(key);
            self.refreshLocalStorage()._render();
        }).on('click', '.delete-cookie', function ()
        {
            var key = util.$(this).data('key');

            util.cookie.remove(key);
            self.refreshCookie()._render();
        }).on('click', '.img-link', function ()
        {
            var src = util.$(this).attr('src');

            var img = new Image();

            img.onload = function ()
            {
                var sources = parent.get('sources');

                sources.set({
                    type: 'img',
                    val: {
                        width: this.width,
                        height: this.height,
                        src: src
                    }
                });

                parent.showTool('sources');
            };

            img.src = src;
        }).on('click', '.css-link', linkFactory('css'))
          .on('click', '.js-link', linkFactory('js'));

        util.orientation.on('change', () => this._render());

        function linkFactory(type)
        {
            return function (e)
            {
                var url = util.$(this).attr('href');

                if (!isCrossOrig(url))
                {
                    e.preventDefault();

                    return util.get(url, (err, data) =>
                    {
                        if (err) return;

                        var sources = parent.get('sources');

                        sources.set({
                            type: type,
                            val: data
                        });

                        parent.showTool('sources');
                    });
                }
            };
        }
    }
    _render()
    {
        var localStoreData = this._localStoreData,
            cookieData = this._cookieData,
            scriptData = this._scriptData,
            stylesheetData = this._stylesheetData,
            imageData = this._imageData;

        this._$el.html(this._tpl({
            localStoreData: localStoreData,
            localStoreState: getState('localStore', localStoreData.length),
            cookieData: cookieData,
            cookieState: getState('cookie', cookieData.length),
            scriptData: scriptData,
            scriptState: getState('script', scriptData.length),
            stylesheetData: stylesheetData,
            stylesheetState: getState('stylesheet', stylesheetData.length),
            imageData: imageData,
            imageState: getState('image', imageData.length)
        }));

        if (this._imageData.length === 0) return;

        setTimeout(() =>
        {
            var $li = this._$el.find('.eruda-image-list li');

            $li.css({height: $li.get(0).offsetWidth});
        }, 150);
    }
}

function getState(type, len)
{
    if (type === 'localStore' || len === 0) return '';

    var warn = 0, danger = 0;

    switch (type)
    {
        case 'cookie': warn = 30; danger = 60; break;
        case 'script': warn = 5; danger = 10; break;
        case 'stylesheet': warn = 4; danger = 8; break;
        case 'image': warn = 50; danger = 100; break;
    }

    if (len >= danger) return 'eruda-danger';
    if (len >= warn) return 'eruda-warn';

    return 'eruda-ok';
}

var origin = window.location.origin;

function isCrossOrig(url)
{
    return !util.startWith(url, origin);
}