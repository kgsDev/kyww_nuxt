import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_FILE_SIZE = 12 * 1024 * 1024; // 12 MB per file
const MAX_TOTAL_FILE_SIZE = 50 * 1024 * 1024; // 50MB total for all files

export default defineEventHandler(async (event) => {
  const form = new IncomingForm({
    multiples: true,
    uploadDir: '/tmp',
    maxFileSize: MAX_FILE_SIZE,
    maxTotalFileSize: MAX_TOTAL_FILE_SIZE,
  });

  return new Promise((resolve, reject) => {
    form.parse(event.node.req, async (err, fields, files) => {
      if (err) {
        console.error('Form parsing error:', err);
        return reject(
          createError({ statusCode: 400, message: 'File parsing failed or file is too large.' })
        );
      }

      try {
        const sampleId = fields.sampleId?.[0];
        const formType = fields.formType?.[0];
        const siteID = fields.siteId?.[0];
        
        if (!sampleId || !formType) {
          console.warn('Missing required fields: Sample ID or Form Type');
          throw createError({ statusCode: 400, message: 'Sample ID and Form Type are required.' });
        }

        const folderMap = { base: 'base', bio: 'bio', hab: 'hab' };
        const folderName = folderMap[formType] || 'base';
        const folderPath = path.join('/webshare/kyww_images', folderName, siteID, String(sampleId));


        // Ensure the folder path exists
        await fs.mkdir(folderPath, { recursive: true });

        const uploadedFileTypes = [];
        let formUploaded = false;

        const processFile = async (key, file) => {
          if (!file) {
            console.warn(`No file found for key: ${key}`);
            return;
          }

          const isPDF = file.mimetype === 'application/pdf';
          const isImage = file.mimetype.startsWith('image/');

          if (key === 'sampleFormFile' && (isPDF || isImage)) {
            const formExtension = isPDF ? 'pdf' : 'png';
            const formFileName = `form_${sampleId}.${formExtension}`;
            const formFilePath = path.join(folderPath, formFileName);

            if (isImage) {
              await sharp(file.filepath)
                .png({ quality: 80 })
                .toFile(formFilePath);
            } else {
              await fs.copyFile(file.filepath, formFilePath);
            }

            await fs.unlink(file.filepath);
            formUploaded = true;
            uploadedFileTypes.push('form');
          } else if (isImage) {
            const newFileName = `${key}_${sampleId}.png`;
            const newFilePath = path.join(folderPath, newFileName);

            await sharp(file.filepath)
              .png({ quality: 80 })
              .toFile(newFilePath);

            await fs.unlink(file.filepath);
            uploadedFileTypes.push(key);
          } else {
            console.warn(`Unsupported file type for key: ${key}, mimetype: ${file.mimetype}`);
          }
        };

        const fileKeys = ['upstream', 'downstream', 'other', 'sampleFormFile'];
        for (const key of fileKeys) {
          if (files[key]) {
            await processFile(key, Array.isArray(files[key]) ? files[key][0] : files[key]);
          }
        }

        resolve({
          status: 200,
          message: 'Files uploaded successfully.',
          uploadedFileTypes,
          formUploaded,
        });
      } catch (error) {
        console.error('Error during file upload:', error);
        reject(createError({ statusCode: 500, message: 'File upload failed.' }));
      }
    });
  });
});