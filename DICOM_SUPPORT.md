# 让 Label Studio 支持 DICOM 文件标注

Label Studio 是一个强大的数据标注工具，但默认情况下它不直接支持 DICOM 文件格式。为了实现对 DICOM 文件的标注，我们可以采用两种方案：

## 方案一：自动将 DICOM 转换为 PNG 后进行标注（推荐）

这是最可行和稳妥的方案，因为它不依赖于 Label Studio 前端对 DICOM 的原生支持，并且可以利用现有的成熟库来完成转换。

### 实现步骤

1.  **安装依赖库**：
    我们需要安装 `pydicom` 和 `Pillow` 库来处理 DICOM 文件并将其转换为 PNG 格式。
    ```bash
    pip install pydicom Pillow
    ```

2.  **修改文件上传处理逻辑**：
    我们需要在 Label Studio 的文件上传处理流程中添加一个步骤，当检测到上传的文件是 DICOM 格式时，自动将其转换为 PNG 格式，然后将转换后的 PNG 文件保存到系统中用于后续的标注任务。

3.  **集成转换功能**：
    可以在 `label_studio/data_import/uploader.py` 或 `label_studio/data_import/models.py` 中添加 DICOM 到 PNG 的转换逻辑。

    以下是一个示例代码，展示如何使用 `pydicom` 和 `Pillow` 将单个 DICOM 文件转换为 PNG：

    ```python
    import os
    import pydicom
    import numpy as np
    from PIL import Image
    from django.core.files.base import ContentFile
    
    def convert_dicom_to_png(dicom_file_path, output_path):
        """
        将 DICOM 文件转换为 PNG 格式
        :param dicom_file_path: DICOM 文件路径
        :param output_path: 输出 PNG 文件路径
        """
        # 读取 DICOM 文件
        ds = pydicom.dcmread(dicom_file_path)
        
        # 获取像素数组
        pixel_array = ds.pixel_array
        
        # 标准化像素值到 0-255 范围
        normalized_array = (pixel_array - pixel_array.min()) / (pixel_array.max() - pixel_array.min())
        scaled_array = (normalized_array * 255).astype(np.uint8)
        
        # 创建图像对象并保存为 PNG
        image = Image.fromarray(scaled_array)
        image.save(output_path, 'PNG')
    
    # 在 FileUpload 模型中添加一个方法来处理 DICOM 文件
    # 在 label_studio/data_import/models.py 中的 FileUpload 类中添加以下方法：
    def convert_and_save_dicom(self):
        if self.format.lower() == '.dcm':
            # 生成 PNG 文件名
            png_filename = self.file_name.replace('.dcm', '.png')
            
            # 创建临时路径来存储转换后的 PNG
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_png:
                tmp_png_path = tmp_png.name
            
            # 执行转换
            convert_dicom_to_png(self.file.path, tmp_png_path)
            
            # 将转换后的 PNG 文件保存到 Django 的 FileField 中
            with open(tmp_png_path, 'rb') as f:
                png_content = ContentFile(f.read())
                self.file.save(png_filename, png_content, save=False)
            
            # 删除临时文件
            os.unlink(tmp_png_path)
            
            # 更新文件格式
            self.format = '.png'
    ```

4.  **在上传流程中调用转换**：
    在 `label_studio/data_import/uploader.py` 的 `create_file_upload` 函数或 `label_studio/data_import/models.py` 的 `FileUpload.save` 方法中调用 `convert_and_save_dicom` 方法。

    例如，在 `label_studio/data_import/models.py` 中修改 `FileUpload` 模型的 `save` 方法：

    ```python
    # 在 label_studio/data_import/models.py 中的 FileUpload 类中
    def save(self, *args, **kwargs):
        # 在保存之前检查是否是 DICOM 文件并进行转换
        if self.format and self.format.lower() == '.dcm':
            self.convert_and_save_dicom()
        super().save(*args, **kwargs)
    ```

5.  **更新支持的文件扩展名**：
    在 `label_studio/core/settings/base.py` 中的 `SUPPORTED_EXTENSIONS` 集合中添加 `.dcm` 扩展名。

    ```python
    # 在 label_studio/core/settings/base.py 中
    SUPPORTED_EXTENSIONS = set(
        [
            '.bmp',
            '.csv',
            '.flac',
            '.gif',
            '.htm',
            '.html',
            '.jpg',
            '.jpeg',
            '.json',
            '.m4a',
            '.mp3',
            '.ogg',
            '.png',
            '.svg',
            '.tsv',
            '.txt',
            '.wav',
            '.xml',
            '.mp4',
            '.webm',
            '.webp',
            '.pdf',
            '.dcm',  # 添加 DICOM 支持
        ]
    )
    ```

### 使用方法

1.  按照上述步骤修改代码并重新部署 Label Studio。
2.  启动 Label Studio。
3.  创建或打开一个项目。
4.  在数据导入页面，上传 DICOM 文件。
5.  系统会自动将 DICOM 文件转换为 PNG 格式并导入。
6.  在标注界面中，您可以像标注普通图像一样对转换后的 PNG 图像进行 2D Bounding Box 标注。

## 方案二：直接支持 DICOM 标注

这种方法需要修改 Label Studio 的前端代码，使其能够直接渲染 DICOM 文件。这比较复杂，需要深入了解 Label Studio 的前端架构和图像渲染机制。由于这需要大量的定制开发工作，并且可能引入兼容性问题，因此不作为首选方案。

## 总结

推荐使用方案一（自动将 DICOM 转换为 PNG 后进行标注），因为它实现相对简单，风险较低，并且可以充分利用 Label Studio 现有的图像标注功能。通过在文件上传阶段进行格式转换，用户可以无缝地使用 Label Studio 对 DICOM 文件进行标注。