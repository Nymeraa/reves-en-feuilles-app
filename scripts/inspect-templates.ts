import { getAllBatches, getTemplates } from '../src/features/LabelStudio/utils/db';

async function inspectTemplates() {
  console.log('Fetching templates from DB...');
  const templates = await getTemplates();
  console.log(`Found ${templates.length} templates.`);

  templates.forEach((t, i) => {
    console.log(`\nTemplate [${i}] name = "${t.name}" (id: ${t.id})`);
    
    if (!t.design) {
      console.log('  ❌ MISSING design object!');
      return;
    }

    if (!t.design.elements) {
      console.log('  ❌ MISSING design.elements array!');
      return;
    }

    if (!Array.isArray(t.design.elements)) {
      console.log(`  ❌ design.elements is NOT an array! Type: ${typeof t.design.elements}`);
      return;
    }

    console.log(`  ✅ Contains ${t.design.elements.length} elements.`);
    if (t.design.elements.length > 0) {
      console.log(`  Sample element ID: ${t.design.elements[0].id}`);
    }
  });
}

inspectTemplates().catch(console.error);
