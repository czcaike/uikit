(function(addon) {

    if (typeof define == "function" && define.amd) { // AMD
        define(["uikit-lightbox"], function(){
            return jQuery.UIkit || addon(window.jQuery, window.jQuery.UIkit);
        });
    }

    if (window && window.jQuery && window.jQuery.UIkit) {
        addon(window.jQuery, window.jQuery.UIkit);
    }

})(function($, UI){

    var modal, cache = {};

    UI.component('lightbox', {

        defaults: {
            "group"      : false,
            "duration"   : 400,
            "keyboard"   : true
        },

        index : 0,
        items : false,

        init: function() {

            var $this = this;

            this.siblings  = this.options.group ? $(this.options.group):this.element;
            this.index     = this.siblings.index(this.element);

            this.trigger('lightbox-init', [this]);
        },

        show: function(index) {

            this.modal = getModal(this);

            // stop previous animation
            this.modal.dialog.stop();
            this.modal.content.stop();

            var $this = this, promise = $.Deferred(), data, source, item, title;

            index = index || 0;

            // index is a jQuery object or DOM element
            if (typeof(index) == 'object') {
                index = this.siblings.index(index);
            }

            // fix index if needed
            if ( index < 0 ) {
                index = this.siblings.length - index;
            } else if (!this.siblings[index]) {
                index = 0;
            }

            item   = this.siblings.eq(index);
            source = item.attr('href');
            title  = item.attr('title');

            data = {
                "lightbox" : $this,
                "source"   : source,
                "type"     : item.data("lightboxType") || 'auto',
                "index"    : index,
                "promise"  : promise,
                "title"    : title,
                "item"     : item,
                "meta"     : {
                    "content" : '',
                    "width"   : null,
                    "height"  : null
                }
            };

            this.index = index;

            this.modal.content.empty();

            if (!this.modal.is(':visible')) {
                this.modal.content.css({width:'', height:''}).empty();
                this.modal.modal.show();
            }

            this.modal.loader.removeClass(UI.prefix('@-hidden'));

            promise.promise().done(function() {

                $this.data = data;
                $this.fitSize(data);

            }).fail(function(){
                alert('Loading resource failed!');
            });

            $this.trigger('show.uk.lightbox', [data]);
        },

        fitSize: function(content) {

            var $this   = this,
                data    = this.data,
                pad     = this.modal.dialog.outerWidth() - this.modal.dialog.width(),
                content = data.meta.content;

            if (this.siblings.length > 1) {

                content = [
                    content,
                    '<a href="#" class="uk-slidenav uk-slidenav-contrast uk-slidenav-previous uk-hidden-touch" data-lightbox-previous></a>',
                    '<a href="#" class="uk-slidenav uk-slidenav-contrast uk-slidenav-next uk-hidden-touch" data-lightbox-next></a>'
                ].join('');
            }

            // calculate width
            var tmp = $('<div>&nbsp;</div>').css({
                'opacity'   : 0,
                'position'  : 'absolute',
                'top'       : 0,
                'left'      : 0,
                'width'     : '100%',
                'max-width' : $this.modal.dialog.css('max-width'),
                'padding'   : $this.modal.dialog.css('padding'),
                'margin'    : $this.modal.dialog.css('margin')
            }), maxwidth, w = data.meta.width, h = data.meta.height;

            tmp.appendTo('body').width();

            maxwidth = tmp.width();

            tmp.remove();

            if (maxwidth < data.meta.width) {

                    h = Math.ceil( h * (maxwidth / w) );
                    w = maxwidth;
            }

            this.modal.content.css('opacity', 0).width(w).html(content);

            this.modal.dialog.find(UI.prefix('.@-modal-caption')).remove();

            if (data.title) {
                this.modal.dialog.append(UI.prefix('<div class="@-modal-caption">')+data.title+'</div>');
            }

            if (data.type == 'iframe') {
                this.modal.content.find('iframe:first').height(h);
            }

            var dh   = h + pad,
                dpad = parseInt(this.modal.dialog.css('margin-top'), 10) + parseInt(this.modal.dialog.css('margin-bottom'), 10),
                t    = (window.innerHeight/2 - dh/2) - pad;

            if (t < 0) {
                t = 0;
            }

            this.modal.closer.addClass(UI.prefix('@-hidden'));

            this.modal.dialog.animate({width: w + pad, height: h + pad, top: t }, $this.options.duration, 'swing', function() {
                $this.modal.loader.addClass(UI.prefix('@-hidden'));
                $this.modal.content.css({width:''}).animate({'opacity': 1}, function() {
                    $this.modal.closer.removeClass(UI.prefix('@-hidden'));
                });
            });
        },

        next: function() {
            this.show(this.siblings[(this.index+1)] ? (this.index+1) : 0);
        },

        previous: function() {
            this.show(this.siblings[(this.index-1)] ? (this.index-1) : this.siblings.length-1);
        }
    });


    // Plugins

    UI.plugin('lightbox', 'image', {

        init: function(lightbox) {

            lightbox.on("show.uk.lightbox", function(e, data){

                if (data.type == 'image' || data.source && data.source.match(/\.(jpg|jpeg|png|gif|svg)$/)) {

                    var resolve = function(source, width, height) {

                        data.meta = {
                            "content" : '<img class="uk-responsive-width" width="'+width+'" height="'+height+'" height="" src ="'+source+'">',
                            "width"   : width,
                            "height"  : height
                        };

                        data.type = 'image';

                        data.promise.resolve();
                    };

                    if (!cache[data.source]) {

                        var img = new Image();

                        img.onerror = function(){
                            data.promise.reject('Loading image failed');
                        };

                        img.onload = function(){
                            cache[data.source] = {width: img.width, height: img.height};
                            resolve(data.source, cache[data.source].width, cache[data.source].height);
                        };

                        img.src = data.source;

                    } else {
                        resolve(data.source, cache[data.source].width, cache[data.source].height);
                    }
                }
            });
        }
    });

    UI.plugin("lightbox", "youtube", {

        init: function(lightbox) {

            var youtubeRegExp = /(\/\/.*?youtube\.[a-z]+)\/watch\?v=([^&]+)&?(.*)/,
                youtubeRegExpShort = /youtu\.be\/(.*)/;


            lightbox.on("show.uk.lightbox", function(e, data){

                var id, matches, resolve = function(id, width, height) {

                    data.meta = {
                        'content': '<iframe src="//www.youtube.com/embed/'+id+'" width="'+width+'" height="'+height+'" style="max-width:100%;"></iframe>',
                        'width': width,
                        'height': height
                    };

                    data.type = 'iframe';

                    data.promise.resolve();
                };

                if (matches = data.source.match(youtubeRegExp)) {
                    id = matches[2];
                }

                if (matches = data.source.match(youtubeRegExpShort)) {
                    id = matches[1];
                }

                if (id) {

                    if(!cache[id]) {

                        var img = new Image();

                        img.onerror = function(){
                            cache[id] = {width:640, height:320};
                            resolve(id, cache[id].width, cache[id].height);
                        };

                        img.onload = function(){
                            cache[id] = {width:img.width, height:img.height};
                            resolve(id, img.width, img.height);
                        };

                        img.src = '//img.youtube.com/vi/'+id+'/0.jpg';

                    } else {
                        resolve(id, cache[id].width, cache[id].height);
                    }

                    e.stopImmediatePropagation();
                }
            });
        }
    });


    UI.plugin("lightbox", "vimeo", {

        init: function(lightbox) {

            var regex = /(\/\/.*?)vimeo\.[a-z]+\/([0-9]+).*?/, matches;


            lightbox.on("show.uk.lightbox", function(e, data){

                var id, resolve = function(id, width, height) {

                    data.meta = {
                        'content': '<iframe src="//player.vimeo.com/video/'+id+'" width="'+width+'" height="'+height+'" style="width:100%;box-sizing:border-box;"></iframe>',
                        'width': width,
                        'height': height
                    };

                    data.type = 'iframe';

                    data.promise.resolve();
                };

                if (matches = data.source.match(regex)) {

                    id = matches[2];

                    if(!cache[id]) {

                        $.ajax({
                            type     : 'GET',
                            url      : 'http://vimeo.com/api/oembed.json?url=' + encodeURI(data.source),
                            jsonp    : 'callback',
                            dataType : 'jsonp',
                            success  : function(data) {
                                cache[id] = {width:data.width, height:data.height};
                                resolve(id, cache[id].width, cache[id].height);
                            }
                        });

                    } else {
                        resolve(id, cache[id].width, cache[id].height);
                    }

                    e.stopImmediatePropagation();
                }
            });
        }
    });

    UI.plugin("lightbox", "video", {

        init: function(lightbox) {

            lightbox.on("show.uk.lightbox", function(e, data){

                var resolve = function(source, width, height) {

                    data.meta = {
                        'content': '<video class="uk-responsive-width" src="'+source+'" width="'+width+'" height="'+height+'" controls width="'+width+'" height="'+height+'"></video>',
                        'width': width,
                        'height': height
                    };

                    data.type = 'video';

                    data.promise.resolve();
                };

                if (data.type == 'video' || data.source.match(/\.(mp4|webm|ogv)$/)) {

                    if (!cache[data.source]) {

                        var vid = $('<video style="position:fixed;visibility:hidden;top:-10000px;"></video>').attr('src', data.source).appendTo('body');

                        var idle = setInterval(function() {

                            if (vid[0].videoWidth) {
                                clearInterval(idle);
                                cache[data.source] = {width: vid[0].videoWidth, height: vid[0].videoHeight};
                                resolve(data.source, cache[data.source].width, cache[data.source].height);
                                vid.remove();
                            }

                        }, 20);

                    } else {
                        resolve(data.source, cache[data.source].width, cache[data.source].height);
                    }
                }
            });
        }
    });

    $(function(){

        UI.$html.on('click', '[data-uk-lightbox]', function(e){

            e.preventDefault();

            var link = $(this);

            if (!link.data("lightbox")) {
                UI.lightbox(link, UI.Utils.options(link.attr("data-uk-lightbox")));
            }

            link.data("lightbox").show(link);
        });

        // keyboard navigation
        UI.$doc.on( 'keyup', function(e) {

            if (modal && modal.is(':visible') && modal.lightbox.options.keyboard) {

                e.preventDefault();

                switch(e.keyCode) {
                    case 37:
                        modal.lightbox.previous();
                        break;
                    case 39:
                        modal.lightbox.next();
                        break;
                }
            }
        });
    });


    function getModal(lightbox) {

        if (modal) {
            modal.lightbox = lightbox;
            return modal;
        }

        // init lightbox container
        modal = UI.$([
            '<div class="@-modal">',
                '<div class="@-modal-dialog @-modal-dialog-lightbox @-slidenav-position" style="margin-left:auto;margin-right:auto;width:200px;height:200px;top:'+Math.abs(window.innerHeight/2 - 200)+'px;">',
                    '<a href="#" class="@-modal-close @-close @-close-alt"></a>',
                    '<div class="@-lightbox-content"></div>',
                    '<div class="@-modal-spinner @-hidden"></div>',
                '</div>',
            '</div>'
        ].join('')).appendTo('body');

        modal.dialog  = modal.find(UI.prefix('.@-modal-dialog:first'));
        modal.content = modal.find(UI.prefix('.@-lightbox-content:first'));
        modal.loader  = modal.find(UI.prefix('.@-modal-spinner:first'));
        modal.closer  = modal.find(UI.prefix('.@-close.@-close-alt'));
        modal.modal   = UI.modal(modal);

        // next / previous
        modal.on("swipeRight swipeLeft", function(e) {
            modal.lightbox[e.type=='swipeLeft' ? 'next':'previous']();
        }).on("click", "[data-lightbox-previous], [data-lightbox-next]", function(e){
            e.preventDefault();
            modal.lightbox[$(this).is('[data-lightbox-next]') ? 'next':'previous']();
        });

        UI.$win.on('load resize orientationchange', UI.Utils.debounce(function(){
            if (modal.is(':visible')) modal.lightbox.fitSize();
        }.bind(this), 100));

        modal.lightbox = lightbox;

        return modal;
    }

    return UI.lightbox;
});
