import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import * as parser from '@babel/parser';
import * as babel from '@babel/traverse';
const traverse = babel.default;

class NuxtAnalyzer {
    constructor(projectPath) {
        this.projectPath = projectPath;
        this.components = new Map();
        this.composables = new Map();
        this.usedComponents = new Set();
        this.usedComposables = new Set();
    }

    async analyze() {
        await this.scanComponents();
        await this.scanComposables();
        await this.analyzeUsage();
        return this.generateReport();
    }

    async scanComponents() {
        const componentPatterns = [
            'components/**/*.vue',
            'layers/**/components/**/*.vue',
            'layers/**/*.vue'
        ];

        for (const pattern of componentPatterns) {
            const componentPaths = await glob(pattern, { cwd: this.projectPath });
            componentPaths.forEach(file => {
                const name = path.basename(file, path.extname(file));
                this.components.set(name, file);
            });
        }
    }

    async scanComposables() {
        const composablePatterns = [
            'composables/**/*.{js,ts}',
            'layers/**/composables/**/*.{js,ts}'
        ];

        for (const pattern of composablePatterns) {
            const composablePaths = await glob(pattern, { cwd: this.projectPath });
            composablePaths.forEach(file => {
                const content = fs.readFileSync(path.join(this.projectPath, file), 'utf-8');
                if (content.includes('export') || path.basename(file, path.extname(file)).startsWith('use')) {
                    const name = path.basename(file, path.extname(file));
                    this.composables.set(name, file);
                }
            });
        }
    }

    extractScriptContent(vueContent) {
        // Handle <script setup> syntax
        const setupMatch = vueContent.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/);
        if (setupMatch) return setupMatch[1];

        // Handle regular <script> syntax
        const scriptMatch = vueContent.match(/<script[^>]*>([\s\S]*?)<\/script>/);
        return scriptMatch ? scriptMatch[1] : '';
    }

    async analyzeUsage() {
        const files = await glob('**/*.{vue,js,ts}', {
            cwd: this.projectPath,
            ignore: [
                'node_modules/**',
                'dist/**',
                '.nuxt/**',
                '.output/**',
                'node_modules/**',
                '.git/**',
                'public/**',
                'static/**'
            ]
        });

        for (const file of files) {
            try {
                const content = fs.readFileSync(path.join(this.projectPath, file), 'utf-8');
                
                if (file.endsWith('.vue')) {
                    this.analyzeVueFile(content);
                } else if (file.endsWith('.ts') || file.endsWith('.js')) {
                    this.analyzeScriptFile(content);
                }
            } catch (e) {
                // Skip files that can't be parsed
                continue;
            }
        }
    }

    analyzeVueFile(content) {
        // Extract template
        const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
        if (templateMatch) {
            const template = templateMatch[1];
            this.analyzeTemplate(template);
        }

        // Extract and analyze script
        const scriptContent = this.extractScriptContent(content);
        if (scriptContent) {
            this.analyzeScriptContent(scriptContent);
        }
    }

    analyzeTemplate(template) {
        this.components.forEach((filepath, componentName) => {
            const kebabCase = this.toKebabCase(componentName);
            const pascalCase = this.toPascalCase(componentName);
            
            // Check for various component usage patterns
            const patterns = [
                `<${kebabCase}`,
                `<${pascalCase}`,
                `<${componentName}`,
                `<Lazy${pascalCase}`,
                `:is="${componentName}"`,
                `is="${componentName}"`
            ];

            if (patterns.some(pattern => template.includes(pattern))) {
                this.usedComponents.add(componentName);
            }
        });
    }

    analyzeScriptContent(content) {
        // Extract imports and composable usage using simple string matching
        // This is more reliable than trying to parse potentially invalid TS/Vue code
        this.composables.forEach((filepath, composableName) => {
            if (
                content.includes(`import ${composableName}`) ||
                content.includes(`import { ${composableName} }`) ||
                content.includes(`const ${composableName} =`) ||
                content.includes(`let ${composableName} =`) ||
                content.includes(`var ${composableName} =`)
            ) {
                this.usedComposables.add(composableName);
            }
        });
    }

    analyzeScriptFile(content) {
        this.analyzeScriptContent(content);
    }

    toKebabCase(str) {
        return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    }

    toPascalCase(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    generateReport() {
        const unusedComponents = [...this.components.keys()]
            .filter(c => !this.usedComponents.has(c))
            .sort();
            
        const unusedComposables = [...this.composables.keys()]
            .filter(c => !this.usedComposables.has(c))
            .sort();

        return {
            summary: {
                totalComponents: this.components.size,
                unusedComponents: unusedComponents.length,
                totalComposables: this.composables.size,
                unusedComposables: unusedComposables.length
            },
            details: {
                unusedComponents: unusedComponents.map(name => ({
                    name,
                    path: this.components.get(name)
                })),
                unusedComposables: unusedComposables.map(name => ({
                    name,
                    path: this.composables.get(name)
                }))
            },
            metrics: {
                componentUsageRate: `${((this.usedComponents.size / this.components.size) * 100).toFixed(1)}%`,
                composableUsageRate: `${((this.usedComposables.size / this.composables.size) * 100).toFixed(1)}%`
            }
        };
    }
}

export default NuxtAnalyzer;