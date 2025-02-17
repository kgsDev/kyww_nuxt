import { fileURLToPath } from 'url';
import { dirname } from 'path';
import NuxtAnalyzer from './nuxt-analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const analyzer = new NuxtAnalyzer(__dirname);

console.log('Starting analysis...');
analyzer.analyze().then(report => {
    console.log('\n📊 Nuxt Project Analysis Report');
    console.log('============================\n');
    
    console.log('Summary:');
    console.log('--------');
    Object.entries(report.summary).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
    });
    
    if (report.details.unusedComponents.length > 0) {
        console.log('\nUnused Components:');
        console.log('----------------');
        report.details.unusedComponents
            .sort((a, b) => a.path.localeCompare(b.path))
            .forEach(({ name, path }) => {
                console.log(`- ${name}`);
                console.log(`  Path: ${path}`);
            });
    }
    
    if (report.details.unusedComposables.length > 0) {
        console.log('\nUnused Composables:');
        console.log('-----------------');
        report.details.unusedComposables
            .sort((a, b) => a.path.localeCompare(b.path))
            .forEach(({ name, path }) => {
                console.log(`- ${name}`);
                console.log(`  Path: ${path}`);
            });
    }
    
    console.log('\nUsage Metrics:');
    console.log('-------------');
    Object.entries(report.metrics).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
    });
});