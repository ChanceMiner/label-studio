# 阿里云部署Label Studio DICOM版本完整指南

本文档详细介绍了如何在阿里云上部署支持DICOM文件的Label Studio版本，包括环境要求、部署步骤和用户访问配置。

## 1. 部署方式选择

根据您的需求和资源情况，可以选择以下两种部署方式：

### 方式一：使用ECS云服务器部署（推荐用于测试和小规模使用）

**优点：**
- 配置简单，易于理解和操作
- 成本相对较低
- 适合测试和小规模使用

**缺点：**
- 需要手动管理服务器和容器
- 扩展性有限

### 方式二：使用阿里云容器服务Kubernetes版（ACK）部署（推荐用于生产环境）

**优点：**
- 高可用性和可扩展性
- 自动化运维
- 更好的资源利用率

**缺点：**
- 配置相对复杂
- 成本较高

## 2. 环境要求

### ECS部署方式：
- 一台阿里云ECS实例（推荐配置：2核4GB以上）
- 操作系统：Alibaba Cloud Linux 3或CentOS 7以上
- 公网IP地址
- 安全组规则已正确配置

### ACK部署方式：
- 一个阿里云容器服务Kubernetes集群
- 阿里云容器镜像服务ACR
- 负载均衡SLB（用于外部访问）

## 3. 具体部署步骤

### ECS部署步骤：

1. **创建ECS实例**
   - 登录阿里云控制台
   - 创建一台ECS实例，选择Alibaba Cloud Linux 3或CentOS 7以上操作系统
   - 确保分配了公网IP地址

2. **配置安全组规则**
   - 在ECS实例的安全组中添加入方向规则：
     - 端口范围：8080（Label Studio默认端口）
     - 授权对象：0.0.0.0/0（或指定特定IP范围）
     - 协议类型：TCP
     - 授权策略：允许

3. **安装Docker**
   - 远程连接到ECS实例
   - 更新系统包管理器：
     ```bash
     sudo yum update -y  # CentOS/Alibaba Cloud Linux
     # 或
     sudo apt update -y  # Ubuntu/Debian
     ```
   - 安装Docker：
     ```bash
     # CentOS/Alibaba Cloud Linux
     sudo yum install -y yum-utils
     sudo yum-config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
     sudo yum install -y docker-ce docker-ce-cli containerd.io
     
     # Ubuntu/Debian
     sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
     curl -fsSL http://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | sudo apt-key add -
     sudo add-apt-repository "deb [arch=amd64] http://mirrors.aliyun.com/docker-ce/linux/ubuntu $(lsb_release -cs) stable"
     sudo apt update
     sudo apt install -y docker-ce
     ```
   - 启动Docker服务：
     ```bash
     sudo systemctl start docker
     sudo systemctl enable docker
     ```

4. **拉取代码并构建镜像**
   - 克隆仓库：
     ```bash
     git clone https://github.com/ChanceMiner/label-studio.git
     cd label-studio
     ```
   - 构建Docker镜像：
     ```bash
     docker build -t label-studio-dicom:latest .
     ```

5. **运行容器**
   - 创建数据目录：
     ```bash
     mkdir -p ./mydata
     ```
   - 运行容器：
     ```bash
     docker run -it -p 8080:8085 -v $(pwd)/mydata:/label-studio/data label-studio-dicom:latest
     ```

6. **访问应用**
   - 在浏览器中访问`http://<ECS公网IP>:8080`

### ACK部署步骤：

1. **创建Kubernetes集群**
   - 登录阿里云容器服务控制台
   - 创建一个Kubernetes集群（推荐至少2个节点）

2. **构建并推送镜像到ACR**
   - 登录阿里云容器镜像服务控制台
   - 创建命名空间和镜像仓库
   - 在本地构建镜像并推送到ACR：
     ```bash
     # 登录ACR
     docker login --username=<your_username> registry.cn-hangzhou.aliyuncs.com
     
     # 构建镜像
     git clone https://github.com/ChanceMiner/label-studio.git
     cd label-studio
     docker build -t label-studio-dicom:latest .
     
     # 标记镜像
     docker tag label-studio-dicom:latest registry.cn-hangzhou.aliyuncs.com/<your_namespace>/label-studio-dicom:latest
     
     # 推送镜像
     docker push registry.cn-hangzhou.aliyuncs.com/<your_namespace>/label-studio-dicom:latest
     ```

3. **部署应用到Kubernetes**
   - 创建Deployment和Service配置文件：
     ```yaml
     # deployment.yaml
     apiVersion: apps/v1
     kind: Deployment
     metadata:
       name: label-studio-dicom
     spec:
       replicas: 1
       selector:
         matchLabels:
           app: label-studio-dicom
       template:
         metadata:
           labels:
             app: label-studio-dicom
         spec:
           containers:
           - name: label-studio-dicom
             image: registry.cn-hangzhou.aliyuncs.com/<your_namespace>/label-studio-dicom:latest
             ports:
             - containerPort: 8085
             volumeMounts:
             - name: data
               mountPath: /label-studio/data
             env:
             - name: POSTGRE_NAME
               value: postgres
             - name: POSTGRE_USER
               value: postgres
             - name: POSTGRE_PASSWORD
               valueFrom:
                 secretKeyRef:
                   name: postgres-secret
                   key: password
             - name: POSTGRE_PORT
               value: "5432"
             - name: POSTGRE_HOST
               value: postgres-service
           volumes:
           - name: data
             persistentVolumeClaim:
               claimName: label-studio-pvc
     ---
     apiVersion: v1
     kind: Service
     metadata:
       name: label-studio-dicom-service
     spec:
       selector:
         app: label-studio-dicom
       ports:
         - protocol: TCP
           port: 80
           targetPort: 8085
       type: LoadBalancer
     ```
     
     ```yaml
     # pvc.yaml
     apiVersion: v1
     kind: PersistentVolumeClaim
     metadata:
       name: label-studio-pvc
     spec:
       accessModes:
         - ReadWriteOnce
       resources:
         requests:
           storage: 10Gi
     ```

4. **应用配置**
   - 创建持久化存储：
     ```bash
     kubectl apply -f pvc.yaml
     ```
   - 部署应用：
     ```bash
     kubectl apply -f deployment.yaml
     ```

5. **获取访问地址**
   - 查看服务状态：
     ```bash
     kubectl get svc
     ```
   - 找到`label-studio-dicom-service`的EXTERNAL-IP，即为访问地址

## 4. 用户访问配置

1. **ECS方式**：
   - 用户直接通过`http://<ECS公网IP>:8080`访问Label Studio

2. **ACK方式**：
   - 用户通过负载均衡器分配的公网IP访问Label Studio
   - 可以配置域名解析指向该IP地址，提供更友好的访问方式

## 5. 注意事项

1. **安全性**：
   - 建议配置SSL证书启用HTTPS访问
   - 限制安全组规则，只开放必要的端口
   - 定期备份数据和数据库

2. **性能优化**：
   - 根据实际使用情况调整ECS实例配置或Kubernetes集群规模
   - 配置适当的资源请求和限制

3. **监控和日志**：
   - 配置日志收集和监控系统
   - 设置告警规则，及时发现和处理问题

4. **数据管理**：
   - 定期备份用户数据和项目配置
   - 合理规划存储空间，确保有足够的容量存储DICOM文件和转换后的PNG文件

通过以上步骤，您就可以成功在阿里云上部署Label Studio DICOM版本，并让用户通过Web端访问使用了。根据您的具体需求和预算，可以选择最适合的部署方式。