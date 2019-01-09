
=================
使用gunicorn 部署
=================
.. section-numbering::

参考：

#. `Deploying Gunicorn <http://docs.gunicorn.org/en/latest/deploy.html>`_
#. `Gunicorn as a SystemD service <http://bartsimons.me/gunicorn-as-a-systemd-service/>`_


install gunicorn
==================
首先需要安装gunicorn，指令如下

::

    sudo pip install gunicorn

部署
======
安装完gunicron后，使用很简单，进入项目目录执行以下命令

.. code:: shell

    gunicorn --bind unix:/tmp/pkms.sock pkms.wsgi:application
    # 也可以使用nohup等工具执行
    nohup gunicorn --bind unix:/tmp/pkms.sock pkms.wsgi:application&

作为开机服务自动启动
=====================
手动总是不方便，我们想在机器需要重启时，也能够自动启用gunicorn项目，
有很多种方法，这里使用linux系统的Systemd。

创建pkms.service
-----------------
在 ``/etc/systemd/system/`` 目录下创建 ``pkms.service`` 文件

::

    vim /etc/systemd/system/pkms.service

内容如下

.. code::

	[Unit]
	Description=pkms
	Requires=pkms.socket
	After=network.target

	[Service]
	User=pkms
	WorkingDirectory=/opt/pkms
	ExecStart=/usr/bin/env gunicorn --bind unix:/run/pkms/socket --pid /run/pkms/pkms.pid pkms.wsgi:application
	ExecReload=/bin/kill -s HUP $MAINPID
	ExecStop=/bin/kill -s TERM $MAINPID
	PrivateTmp=true

	[Install]
	WantedBy=multi-user.target

创建pkms.socket
-----------------
在 ``/etc/systemd/system/`` 目录下创建 ``pkms.socket`` 文件

::

    vim /etc/systemd/system/pkms.socket

内容如下::

    [Unit]
    Description=pkms socket

    [Socket]
    ListenStream=/run/pkms/socket

    [Install]
    WantedBy=sockets.target

创建pkms.conf
---------------
在 ``/etc/tmpfiles.d/`` 目录下创建 ``pkms.conf`` 文件，内容如下::

    # d /run/pkms 0755 someuser somegroup -
    d /run/pkms 0755 root root -

最后启动服务
-------------
不要忘记设置service文件可执行权限，及让新建的服务生效，然后就可以使用系统服务

.. code::

    chmod 755 /etc/systemd/system/pkms.service
    systemctl daemon-reload
    systemctl enable pkms.socket
    systemctl enable pkms.service
    systemctl start pkms.socket
    systemctl start pkms

以后就可以使用systemctl或service来 开启/重启/停止 pkms::

    systemctl start/restart/stop pkms
    service pkms start/restart/stop



测试
--------
gunicorn部分部署好，运行以下命令可以看到一些html输出::

    curl --unix-socket /run/pkms/socket http

nginx 配置
===========

集成到nginx，配置如下

.. code:: nginx

	upstream pkms_server {
		server unix:/run/pkms/socket fail_timeout=0;
	}

	server {
		listen 80 default_server;
		listen [::]:80 default_server;

		index index.html index.htm index.nginx-debian.html;
		server_name _;

		location / {
			# First attempt to serve request as file, then
			# as directory, then fall back to displaying a 404.
			try_files $uri @proxy_to_pkms;
		}
		location @proxy_to_pkms {
			proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
			# enable this if and only if you use HTTPS
			# proxy_set_header X-Forwarded-Proto https;
			proxy_set_header Host $http_host;
			# we don't want nginx trying to do something clever with
			# redirects, we set the Host: header above already.
			proxy_redirect off;
			proxy_pass http://pkms_server;
		}
		location /static/ {
		    # 假如是部署在 /opt 目录下，根据自己部署情况做适当修改
			alias /opt/pkms/static/;
		}
		location /media/ {
			alias /opt/pkms/media/;
		}
		location /staticpage/ {
			default_type text/html;
			alias /opt/pkms/staticpage/;
		}
		location /publicpage/ {
			default_type text/html;
			alias /opt/pkms/publicpage/;
		}
	}

重新载入nginx， 部署完成.

.. code:: shell

    service nginx reload


