# 生产环境部署指南 (Apache)

本文档提供了将AI驱动的汽车行业情报平台前端应用部署到使用Apache作为Web服务器的Ubuntu服务器上的详细步骤和配置。

## 1. 部署架构

根据您的要求，部署架构如下：

-   **前端应用**: 静态文件 (HTML, JS, CSS) 位于 `/srv/application/AI驱动的汽车行业情报平台/WebService/dist`。
-   **后端API**: 在同一台服务器上运行，监听 `http://127.0.0.1:7656`。
-   **公网访问**: 用户通过 `https://intelligenceworker.jingyu.today:8081` 访问。
-   **网络流程**:
    1.  公网 `8081` 端口的请求由路由器转发到服务器的 `443` 端口。
    2.  Apache在 `443` 端口上监听，处理HTTPS请求。
    3.  Apache提供前端静态文件服务。
    4.  Apache作为反向代理，将 `/api/` 的请求转发给后端的 `7656` 端口，并将 `/socket.io/` 的WebSocket连接也转发到 `7656` 端口。

## 2. 前置准备

### 2.1. 构建应用

在部署之前，您需要在项目根目录执行以下命令来生成生产环境的静态文件。

```bash
npm run build
```

此命令会在项目根目录下创建一个 `dist` 目录，请将此 `dist` 目录的**所有内容**上传到服务器的 ` /srv/application/AI驱动的汽车行业情报平台/WebService/dist` 路径下。

### 2.2. 启用Apache模块

确保您的Apache服务器已启用以下必要的模块。您可以使用 `a2enmod` 命令来启用它们。

```bash
sudo a2enmod ssl
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod rewrite
```

启用后，需要重启Apache服务使模块生效：

```bash
sudo systemctl restart apache2
```

## 3. Apache虚拟主机配置

在您的Apache配置目录（通常是 `/etc/apache2/sites-available/`）下，创建一个新的配置文件，例如 `intelligence-platform.conf`，并填入以下内容。

```apache
<VirtualHost *:443>
    ServerName intelligenceworker.jingyu.today
    DocumentRoot /srv/application/AI驱动的汽车行业情报平台/WebService/dist

    # 1. SSL/TLS 加密配置
    SSLEngine on
    SSLCertificateFile      /etc/letsencrypt/live/jingyu.today/fullchain.pem
    SSLCertificateKeyFile   /etc/letsencrypt/live/jingyu.today/privkey.pem
    
    # 推荐的SSL安全设置
    SSLProtocol all -SSLv2 -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite HIGH:!aNULL:!MD5:!ADH:!RC4
    SSLHonorCipherOrder on
    
    # 2. WebSocket 反向代理 (用于Socket.IO实时通信)
    # 使用 mod_rewrite 捕获 WebSocket 的 Upgrade 请求头
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/socket.io/(.*) "ws://127.0.0.1:7656/socket.io/$1" [P,L]

    # 3. API 反向代理
    # 将所有 /api/ 开头的请求转发到后端API服务
    # 末尾的斜杠很重要，它能确保路径正确映射
    # 例如: /api/sources -> http://127.0.0.1:7656/sources
    ProxyRequests off
    ProxyPreserveHost On
    ProxyPass /api/ http://127.0.0.1:7656/
    ProxyPassReverse /api/ http://127.0.0.1:7656/

    # 4. 单页应用 (SPA) 路由配置
    # 此配置确保用户在浏览器中直接访问 /feed 或刷新页面时，
    # 请求能正确返回 index.html，由前端React Router接管路由。
    <Directory /srv/application/AI驱动的汽车行业情报平台/WebService/dist>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        
        RewriteEngine On
        # 如果请求的不是一个已存在的文件或目录
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        # 则将请求重写到 /index.html
        RewriteRule . /index.html [L]
    </Directory>

    # 5. 日志配置
    ErrorLog ${APACHE_LOG_DIR}/intelligence-platform-error.log
    CustomLog ${APACHE_LOG_DIR}/intelligence-platform-access.log combined

</VirtualHost>
```

## 4. 启用站点并重启

保存配置文件后，执行以下命令来启用新的站点配置并重启Apache。

```bash
# 启用新的站点配置文件
sudo a2ensite intelligence-platform.conf

# 检查配置语法是否有误
sudo apache2ctl configtest

# 如果没有错误，平滑重启Apache服务以应用更改
sudo systemctl reload apache2
```

部署完成！现在您应该可以通过 `https://intelligenceworker.jingyu.today:8081` 访问您的应用了。
