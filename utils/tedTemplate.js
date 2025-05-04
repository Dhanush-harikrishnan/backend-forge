import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure templates directory exists
const templatesDir = path.join(__dirname, '../templates');
const outputDir = path.join(__dirname, '../uploads/resumes');

if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

/**
 * Generate a resume using TED format (TailwindCSS Template-Engineered Design)
 * @param {Object} resumeData - Resume data
 * @param {string} resumeId - Resume ID
 * @returns {Promise<string>} - Path to the generated HTML file
 */
export const generateTEDResume = (resumeData, resumeId) => {
  return new Promise((resolve, reject) => {
    try {
      const outputPath = path.join(outputDir, `${resumeId}.html`);
      
      // Generate the HTML content with TailwindCSS
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${resumeData.personalInfo.name} - Resume</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page {
      size: letter;
      margin: 0;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: #111827;
    }
    .page {
      width: 8.5in;
      height: 11in;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      background-color: white;
      margin: 0 auto;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
        background: white;
      }
      .page {
        box-shadow: none;
      }
      .no-print {
        display: none;
      }
    }
    .section-heading {
      position: relative;
      display: flex;
      align-items: center;
      margin-bottom: 1rem;
    }
    .section-heading::after {
      content: '';
      flex-grow: 1;
      height: 1px;
      background-color: #d1d5db;
      margin-left: 1rem;
    }
    .contact-info {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
    }
    .contact-info span {
      display: flex;
      align-items: center;
    }
    .contact-info span:not(:last-child)::after {
      content: '•';
      margin-left: 0.5rem;
    }
  </style>
</head>
<body class="bg-gray-100">
  <div class="no-print fixed top-4 right-4 flex gap-2">
    <button onclick="window.print()" class="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">Print/Save PDF</button>
    <button onclick="window.close()" class="bg-gray-600 text-white px-4 py-2 rounded shadow hover:bg-gray-700">Close</button>
  </div>

  <div class="page mx-auto my-8 p-8 bg-white">
    <!-- Header -->
    <header class="text-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900">${resumeData.personalInfo.name}</h1>
      <div class="contact-info text-sm mt-2 text-gray-600">
        ${resumeData.personalInfo.email ? `<span>${resumeData.personalInfo.email}</span>` : ''}
        ${resumeData.personalInfo.phone ? `<span>${resumeData.personalInfo.phone}</span>` : ''}
        ${resumeData.personalInfo.address ? `<span>${resumeData.personalInfo.address}</span>` : ''}
      </div>
      <div class="contact-info text-sm mt-1 text-gray-600">
        ${resumeData.personalInfo.linkedin ? `<span>LinkedIn: ${resumeData.personalInfo.linkedin}</span>` : ''}
        ${resumeData.personalInfo.github ? `<span>GitHub: ${resumeData.personalInfo.github}</span>` : ''}
        ${resumeData.personalInfo.website ? `<span>Website: ${resumeData.personalInfo.website}</span>` : ''}
      </div>
    </header>

    <!-- Summary Section -->
    ${resumeData.summary ? `
    <section class="mb-6">
      <h2 class="text-lg font-semibold text-gray-900 section-heading">Professional Summary</h2>
      <p class="text-gray-700">${resumeData.summary}</p>
    </section>
    ` : ''}

    <!-- Skills Section -->
    ${resumeData.skills && resumeData.skills.length > 0 ? `
    <section class="mb-6">
      <h2 class="text-lg font-semibold text-gray-900 section-heading">Skills</h2>
      <div class="flex flex-wrap gap-2">
        ${resumeData.skills.map(skill => `
          <span class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">${skill}</span>
        `).join('')}
      </div>
    </section>
    ` : ''}

    <!-- Experience Section -->
    ${resumeData.experience && resumeData.experience.length > 0 ? `
    <section class="mb-6">
      <h2 class="text-lg font-semibold text-gray-900 section-heading">Professional Experience</h2>
      ${resumeData.experience.map(exp => `
        <div class="mb-4 last:mb-0">
          <div class="flex justify-between items-baseline">
            <h3 class="font-medium text-gray-900">${exp.position}</h3>
            <span class="text-sm text-gray-600">${exp.startDate} - ${exp.endDate || 'Present'}</span>
          </div>
          <div class="text-gray-700">${exp.company}</div>
          <p class="mt-1 text-gray-700">${exp.description}</p>
          ${exp.bullets && exp.bullets.length > 0 ? `
            <ul class="mt-2 list-disc list-inside">
              ${exp.bullets.map(bullet => `<li class="text-gray-700 text-sm ml-2">${bullet}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `).join('')}
    </section>
    ` : ''}

    <!-- Education Section -->
    ${resumeData.education && resumeData.education.length > 0 ? `
    <section class="mb-6">
      <h2 class="text-lg font-semibold text-gray-900 section-heading">Education</h2>
      ${resumeData.education.map(edu => `
        <div class="mb-4 last:mb-0">
          <div class="flex justify-between items-baseline">
            <h3 class="font-medium text-gray-900">${edu.degree} in ${edu.field}</h3>
            <span class="text-sm text-gray-600">${edu.startDate} - ${edu.endDate || 'Present'}</span>
          </div>
          <div class="text-gray-700">${edu.institution}</div>
          ${edu.gpa ? `<p class="text-sm text-gray-700">GPA: ${edu.gpa}</p>` : ''}
        </div>
      `).join('')}
    </section>
    ` : ''}

    <!-- Projects Section -->
    ${resumeData.projects && resumeData.projects.length > 0 ? `
    <section class="mb-6">
      <h2 class="text-lg font-semibold text-gray-900 section-heading">Projects</h2>
      ${resumeData.projects.map(project => `
        <div class="mb-4 last:mb-0">
          <h3 class="font-medium text-gray-900">${project.title}</h3>
          <p class="mt-1 text-gray-700">${project.description}</p>
          ${project.technologies && project.technologies.length > 0 ? `
            <div class="mt-2 flex flex-wrap gap-1">
              ${project.technologies.map(tech => `
                <span class="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs">${tech}</span>
              `).join('')}
            </div>
          ` : ''}
          <div class="mt-1 text-sm">
            ${project.github ? `<a href="${project.github}" target="_blank" class="text-blue-600 hover:underline">GitHub</a>` : ''}
            ${project.url ? `${project.github ? ' • ' : ''}<a href="${project.url}" target="_blank" class="text-blue-600 hover:underline">Demo</a>` : ''}
          </div>
        </div>
      `).join('')}
    </section>
    ` : ''}

    <!-- Footer -->
    <footer class="text-xs text-gray-500 text-center mt-8">
      Generated on ${new Date().toLocaleDateString()} • ${resumeData.personalInfo.name} • TrackPro Resume
    </footer>
  </div>
</body>
</html>
      `;
      
      // Write the content to file
      fs.writeFileSync(outputPath, htmlContent);
      logger.info(`TED Resume created at ${outputPath}`);
      resolve(outputPath);
    } catch (error) {
      logger.error('Error generating TED resume:', error);
      reject(error);
    }
  });
};

export default { generateTEDResume }; 