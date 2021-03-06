;(function(win){
	"use strict";
	//全局变量 >> HSKJ
	var HSKJ = {
	    //全局初始化函数
		ready: function(callback){
			this.checkLogin();
	        this.watch();
	        callback && callback();
	    },
	    //发送get请求
	    GET: function(options){
	        var self = this;
	        self.ajax(options,'get');
	    },
	    //发送post请求
	    POST: function(options){
	        var self = this;
	        self.ajax(options,'post');
	    },
	    ajax: function(opts, type){
			var self = this;
	        $.ajax({
				url: ENV.API + opts.url,
				data: opts.data,
				type: type,
	            async: opts.async,
	            beforeSend: function() {
	                opts.beforeSend && opts.beforeSend();
	            },
	            success: function(json) {
	                if(json){
	                    console.log(opts.baseUrl || opts.url,' ajax is successful',json);
	                    opts.success && opts.success(json);

						self.checkAjaxCodeIsLogin(json.code);
						if (opts[json.code]){//区分不同的状态码回调函数
							console.log(opts.baseUrl || opts.url, 'ajax status is', json.code, '并已回调' + json.code +'方法');
							eval(opts[json.code])(json);
	                    }
	                }else{
	                    console.error(opts.baseUrl || opts.url,'ajax 数据返回格式异常');
	                    HSKJ.ajaxError();
	                }
	            },
	            error: function(){
	                console.error(opts.baseUrl || opts.url,' ajax is error');
	                opts.error != undefined ? opts.error() : HSKJ.commonError();
	            },
	            complete: function(XMLHttpRequest, textStatus) {
					HSKJ.loadingHide();
	                console.log(opts.baseUrl || opts.url,' ajax is complete');
	            },
	            timeout: opts.timeout || 20000
	        })
		},

		/**
		 * 上传图片
		 */
		uploadFile: function(opts){
			layui.upload.render({
				elem: opts.elem
				, url: ENV.FILE_URL + opts.url
				, field: opts.field
				, before: function (obj) {
					layui.layer.msg('上传中，请稍后...');
					//预读本地文件示例，不支持ie8，图片链接（base64）
					obj.preview(function (index, file, result) {
						opts.preview && opts.preview(index, file, result)
					});
				}
				, accept: 'images'
				, size: opts.size || 1024*10
				, done: function (res) {
					if (res.code > 0) {
						return layui.layer.msg('上传失败');
					} else if (res.code == 0) {
						opts.done && opts.done(res)
						return layui.layer.msg('上传成功');
					}
				}
				, error: function () {
					layui.layer.msg('上传失败，请重试！')
				}
			});
		},

		/**
		 * 渲染表格，针对layui的表格加强封装，
		 * 默认增加所有列居中、禁止列拖动
		 * @param {any} opts 所有参数，尽量靠近layui的参数
		 */
		renderTable: function(opts){
			HSKJ.loadingShow();

			var arr = [];
			opts.cols.forEach(function(v) {
				arr.push(Object.assign(v, {
					align: 'center', 
					unresize: true
				}));
			}, this);

			var noDataHtml = [
				'<div class="module-no-data">',
					'<img src="' + ENV.PAGE + 'img/info/no-data.png" />',
					'<p>暂时没有数据哦~</p>',
				'</div'
			];

			layui.layer.closeAll('tips');//表格超出部分点击后的弹框消失
			layui.table.render({
				id: opts.id
				, elem: opts.elem
				, url: opts.url
				, where: opts.where
				, cols: [arr]
				, skin: 'line'
				, page: {
					layout: ['prev', 'page', 'next']
					, first: false
					, last: false
					, theme: '#3ddfd5'
				}
				, limit: opts.limit || 10
				, text: {
					none: noDataHtml.join('')
				}
				, done: function (res, curr, count) {
					opts.done && opts.done(res, curr, count);
					HSKJ.loadingHide();
					HSKJ.checkAjaxCodeIsLogin(res.code);
				}
			});
		},

		/**
		 * 动态加载JS，异步
		 */
		loadScript: function (url, id, callback) {
			var script = document.createElement("script");
			var head = document.head || document.getElementsByTagName('head')[0];
			script.type = "text/html";
			script.id = id;
			script.src = url + '?ver=' + Math.random();

			if (callback) {
				script.onload = script.onreadystatechange = function () {
					setTimeout(function () {
						callback();
					}, 20);
				}
			}

			head.appendChild(script);
		},

		/**
		 * 动态加载JS，同步
		 */
		synchronizationScript: function (url, callback) {
			console.log(1)
			$.ajax({
				async: false,
				dataType: "script",
				url: url,
				success: function (json) {
					callback && callback();
				}
			});
		},

	    /**
	     * 获取url后面的参数，优化后版本
	     * @param  {[type]} name [par]
	     * @return {[type]}
	     */
	    getUrlParameter: function(name){
	        var _reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i"),
	            _regNext = window.location.search.substr(1).match(_reg);
	        if (_regNext != null) return decodeURI(_regNext[2]) || '';
	        else return '';
		},
		
		/**
		 * 获取验证码
		 * elem点击的元素
		 */
		getCode: function(elem, callback){
			if (elem.hasClass('disable')) {
				return;
			}
			elem.addClass('disable')
			var time = 59,
				txt = time + 's';
			elem.html(txt);
			//发送请求
			callback && callback();
			
			var timer = setInterval(function () {
				time--;
				if (time == 0) {
					txt = '重新获取';
					time = 59;
					clearInterval(timer)
					elem.removeClass('disable')
				} else {
					txt = time + 's'
				}

				elem.html(txt);
			}, 1000)
		},
		
		/**
		 * 写入登录用户的资料
		 */
		setUserInfo: function(data, callback){
			if (typeof data == 'object') {
				for (var i in data) {
					$.cookie(i, data[i], { expires: 7, path: '/' });
				}
			}else{

			}

			callback && callback();
		},

		/**
		 * 获取用户信息，传入cookie的key获得value
		 */
		getUserInfo: function(key){
			return $.cookie(key); //目前暂时没有其他操作，直接返回key-value
		},

		/**
		 * 根据后台返回的code判断是否登录session失效，用于所有ajax和数据表格
		 */
		checkAjaxCodeIsLogin: function(code){
			var self = this;
			if (code == '100012') {
				layui.layer.msg('登录已过期，请重新登录！', { icon: 5 }, function () {
					self.toLoginPage();
				})
			}
		},
	    /**
	     * 判断是否登录
		 * 没有登录直接跳转去登录
	     */
	    checkLogin: function(){
			var username = this.getUserInfo('username');
			if (!username){
				this.toLoginPage();
			}
		},

		/** 
		 * 执行退出登录
		*/
		doLogout: function(callback){
			HSKJ.POST({
				url: 'systemuser/logout',
				beforeSend: function () {
					HSKJ.loadingShow();
				},
				success: function (json) {
					if (json && json.code == 0) {
						callback && callback();
					} else {
						layui.layer.msg(json.message)
					}
				}
			})
		},
		
		/**
		 * 去登录页，区分不同角色
		 */
		toLoginPage: function(callback){
			var roleid = this.getUserInfo('roleid');
			if (!roleid){
				this.openPage(ENV.PAGE + 'page/admin/login.html');
			}
			if (roleid == 1){//管理员
				this.openPage(ENV.PAGE + 'page/admin/login.html');
			} else if (roleid == 2){ //机构
				this.openPage(ENV.PAGE + 'page/organization/login.html');
			} else if (roleid == 3){ //会议举办方
				this.openPage(ENV.PAGE + 'page/sponsor/login.html');
			}

			callback && callback();
		},

	    /**
	     * 去错误页面
	     */
	    toErrorPage: function(status){
	        this.openPage(URL.BASE + status);
	    },

	    /**
	     * 通用的跳转页面
	     *
	     * target "_blank" 新窗口打开
	     * @return {[type]} [description]
	     */
	    openPage: function(href,target){
	    	if (target) {
	    		window.open(href, target)
	    	}else{
	    		//todo  暂定使用location.href 没有版本号
	    		window.location.href = href;
	    	}
	    },

        /**
         * 通用的加载中动画
         */
        loadingShow: function(msg){
			this.loading = layui.layer.load(2, { time: 10 * 1000 });
			/* var html = ['<div class="hs-loading">',
							'<img src="./img/icon/icon-loading.gif" alt=" ">',
							'<p class="element-loading-text">'+ msg +'</p>',
						'</div>'
						]
			layui && layui.layer.msg(html.join('')); */
        },

        /**
         * 加载中动画消失
         * @return {[type]} [description]
         */
	    loadingHide: function(){
			this.loading && layui.layer.close(this.loading);
			/* $('.hs-loading').remove(); */
        },

        /**
         * 通用的错误提示
         * @param  {[type]} element [待展示错误的dom]
         * @return {[type]}         [description]
         */
        commonError: function(element){
            console.error('出错');
        },

		/**
		 * 覆盖方式
		 * el 显示模板html的地方
		 * tplpath 模板路径
		 * data 渲染模板的数据
		 * callback 渲染完成后回调函数
		 */
		renderTpl: function (el, tplPath, data, callback) {
			require([tplPath], function (html) {
				$(el).html(layui ? layui.laytpl(html).render(data || {}): '缺少模板引擎依赖');
				callback && callback();
			})	
		},

		/**
		 * 重叠方式
		 * el 显示模板html的地方
		 * tplpath 模板路径
		 * data 渲染模板的数据
		 * callback 渲染完成后回调函数
		 */
		renderFixTpl: function (el, tplPath, data, callback) {
			require([tplPath], function (html) {
				$(el).children('.module-container-fix').remove();
				$(el).append(layui ? layui.laytpl(html).render(data || {}) : '缺少模板引擎依赖');
				callback && callback();
			})
		},

	    /**
         * 数据请求失败提示
         * @param  {[type]}
         * @return {[type]}         [description]
         */
		ajaxError: function () {
			alert('请求失败，请稍后重试！');
		},

		/** 
		 * 'yyyy-MM-dd HH:mm:ss'
		 * 给完整的时间去掉秒
		*/
		cutDatetimess: function(str){
			return str.substring(0, 16)
		},

		/** 
		 * 给完整的时间去掉年、秒
		*/
		cutDatetimeyyyyAndss: function (str) {
			return str.substring(5, 16)
		},

	    //所有全局事件监听
	    watch: function(){
	        var self = this;

	        //ajax 错误监听
			$(document)
			.on('ajaxError', function(e, xhr, options){
	            var status = xhr.status;
	            /*if (404 == status) {
	                self.openPage(404)
	            }else if(500 == status){
	                self.openPage(500)
	            }*/
			}).on('click', '.tabs-item', function(){
				$(this).addClass('active').siblings().removeClass('active');
			})
			.on('click', '.module-go-back', function () {//后退
				window.location.go(-1)
			})
			.on('click', '.module-go-login', function () {//去登录
				self.toLoginPage();
			})
			.on('click', '.module-go-regist', function () {//去注册
				window.location.href = '/page/base/regist.html'
			})
			.on('click', '.module-go-forgot', function () {//忘记密码
				window.location.href = '/page/base/pwd-find.html'
			})
			.off('click', '.module-go-logout')
			.on('click', '.module-go-logout', function () {//退出登录
				layer.confirm(
					'<p class="hs-align-center">确定退出登录吗？</p>',
					function (index) {
						self.doLogout(function () {
							self.toLoginPage()
						})
					}
				);
				
			})
	    }
	}

	if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {
		define(function() {
			return HSKJ;
		});
	} else if (typeof module !== 'undefined' && module.exports) {
		module.exports = HSKJ;
		module.exports.HSKJ = HSKJ;
	} else {
		win.HSKJ = HSKJ;
	}

})(window)
