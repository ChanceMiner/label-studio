# Label Studio 项目概述

Label Studio 是一个开源的数据标注工具，支持对音频、文本、图像、视频和时间序列等多种类型的数据进行标注。它提供了一个简单直观的 UI 界面，并可以将标注结果导出为多种机器学习模型所需的格式。

## 项目结构

该项目是一个全栈应用，主要由以下部分组成：

- **后端 (Python/Django)**: 位于 `label_studio/` 目录下，包含了核心的业务逻辑、数据模型、API 接口以及与数据库的交互。
- **前端 (JavaScript/React/NX)**: 位于 `web/` 目录下，使用 React 和 NX 构建，包含了主应用 (`apps/labelstudio`) 和两个核心库 (`libs/editor` 和 `libs/datamanager`)。
- **部署与配置**: 包含了 Dockerfile、docker-compose 文件、Nginx 配置等，用于项目的容器化部署。

## 技术栈

- **后端**: Python 3.10+, Django 5.1.x, Django REST Framework, Poetry (依赖管理)
- **前端**: Node.js, React, NX, Yarn (依赖管理)
- **数据库**: 默认使用 SQLite (开发) 或 PostgreSQL (生产)
- **其他**: Redis (任务队列), RQ (任务队列库)

## 开发环境设置与运行

### 后端开发

1.  **安装依赖**: 使用 Poetry 安装后端依赖。
    ```bash
    poetry install
    ```
2.  **数据库迁移**: 首次运行或模型变更后，需要应用数据库迁移。
    ```bash
    # 使用 SQLite 进行开发
    make migrate-dev
    ```
3.  **运行开发服务器**: 启动 Django 开发服务器。
    ```bash
    # 使用 SQLite 进行开发
    make run-dev
    ```

### 前端开发

1.  **安装依赖**: 进入 `web/` 目录，使用 Yarn 安装前端依赖。
    ```bash
    cd web
    yarn install --frozen-lockfile
    ```
2.  **运行开发服务器 (HMR)**: 在 `web/` 目录下运行，以启用热模块替换。
    ```bash
    # 在 web/ 目录下
    yarn run dev
    ```
    或者在项目根目录运行:
    ```bash
    make frontend-dev
    ```

### 使用 Docker Compose 运行 (推荐用于快速启动)

```bash
# 构建并启动服务 (Label Studio, Nginx, PostgreSQL)
docker-compose up --build
```

## 构建与测试

### 构建

- **构建前端**: 在 `web/` 目录下运行 `yarn run build` 或在项目根目录运行 `make frontend-build`。
- **构建 Docker 镜像**: `docker build -t heartexlabs/label-studio:latest .`

### 测试

- **后端单元测试**: 在 `label_studio/` 目录下运行 `pytest`，或使用 `make test`。
- **前端单元测试**:
  - Label Studio App: `yarn ls:unit`
  - Editor (Frontend): `yarn lsf:unit`
  - Datamanager: `yarn dm:unit`
- **运行所有单元测试**: `yarn test:unit` (在 `web/` 目录下)

### 附加开发命令

#### 前端开发命令

- `yarn ls:dev`: 构建主 Label Studio 应用并启用热模块替换进行开发
- `yarn ls:watch`: 持续构建主 Label Studio 应用进行开发
- `yarn lsf:watch`: 持续构建 Label Studio Frontend 库进行开发
- `yarn lsf:serve`: 启动独立模式的 Label Studio Frontend 开发服务器
- `yarn dm:watch`: 持续构建 Datamanager 库进行开发
- `yarn watch`: 启动带有热模块替换的开发构建
- `yarn dev`: 启动带有热模块替换的开发服务器
- `yarn ui:serve`: 启动 Storybook UI 开发服务器
- `yarn playground:serve`: 启动 Playground 开发服务器

#### 前端测试命令

- `yarn ls:unit`: 运行主 Label Studio 应用的单元测试
- `yarn ls:e2e`: 运行主 Label Studio 应用的端到端测试
- `yarn lsf:unit`: 运行 Label Studio Frontend 库的单元测试
- `yarn lsf:integration`: 运行 Label Studio Frontend 库的集成测试
- `yarn lsf:e2e`: 运行 Label Studio Frontend 库的端到端测试
- `yarn dm:unit`: 运行 Datamanager 库的单元测试
- `yarn test:unit`: 运行所有单元测试
- `yarn test:unit:coverage`: 运行所有单元测试并生成覆盖率报告
- `yarn test:e2e`: 运行所有端到端测试
- `yarn test:integration`: 运行所有集成测试

#### 其他有用的命令

- `yarn lint`: 使用 Biome 检查并修复代码
- `yarn docs`: 生成文档
- `yarn version:libs`: 更新库版本