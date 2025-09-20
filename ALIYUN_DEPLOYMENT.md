# Label Studio DICOM 支持版本阿里云部署指南

本文档介绍了如何在阿里云上部署支持DICOM文件的Label Studio版本。

## 部署选项

### 1. 使用Docker镜像部署（推荐）

#### 构建Docker镜像
```bash
# 克隆仓库
git clone https://github.com/ChanceMiner/label-studio.git
cd label-studio

# 构建Docker镜像
docker build -t label-studio-dicom:latest .
```

#### 运行容器
```bash
# 创建数据目录
mkdir -p ./mydata

# 运行容器
docker run -it -p 8080:8085 -v $(pwd)/mydata:/label-studio/data label-studio-dicom:latest
```

### 2. 使用Docker Compose部署（包含PostgreSQL数据库）

#### 启动服务
```bash
# 克隆仓库
git clone https://github.com/ChanceMiner/label-studio.git
cd label-studio

# 启动服务
docker-compose up -d
```

服务将在端口8080上可用。

### 3. 阿里云容器服务部署

#### 推送镜像到阿里云容器镜像服务
```bash
# 登录阿里云容器镜像服务
docker login --username=<your_username> registry.cn-hangzhou.aliyuncs.com

# 标记镜像
docker tag label-studio-dicom:latest registry.cn-hangzhou.aliyuncs.com/<your_namespace>/label-studio-dicom:latest

# 推送镜像
docker push registry.cn-hangzhou.aliyuncs.com/<your_namespace>/label-studio-dicom:latest
```

#### 在阿里云容器服务中部署
1. 登录阿里云容器服务控制台
2. 创建Kubernetes集群或使用现有的集群
3. 创建Deployment和Service配置：

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

#### 应用配置
```bash
# 创建持久化存储
kubectl apply -f pvc.yaml

# 部署应用
kubectl apply -f deployment.yaml
```

## 环境变量配置

以下环境变量可以在部署时配置：

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| POSTGRE_NAME | PostgreSQL数据库名 | postgres |
| POSTGRE_USER | PostgreSQL用户名 | postgres |
| POSTGRE_PASSWORD | PostgreSQL密码 | (空) |
| POSTGRE_PORT | PostgreSQL端口 | 5432 |
| POSTGRE_HOST | PostgreSQL主机 | db |
| LABEL_STUDIO_HOST | Label Studio主机地址 | (空) |

## 使用DICOM功能

部署完成后，您可以：
1. 访问Label Studio界面
2. 创建新项目或打开现有项目
3. 在数据导入页面上传DICOM文件（.dcm扩展名）
4. 系统会自动将DICOM文件转换为PNG格式进行标注
5. 进行常规的图像标注工作

## 注意事项

1. 确保有足够的存储空间来存储上传的DICOM文件和转换后的PNG文件
2. 根据需要调整Nginx配置中的`client_max_body_size`以支持大文件上传
3. 对于生产环境，建议配置SSL证书以启用HTTPS
4. 定期备份数据库和上传的文件