import 'dotenv/config';
import { createSupplierSchema } from '../src/lib/zod-schemas';
import { nullToUndefinedDeep } from '../src/lib/null-utils';

async function verifySupplierFix() {
  console.log('=== STARTING SUPPLIER FIX VERIFICATION ===\n');

  const testCases = [
    {
      name: 'Case 1: Only name',
      input: { name: 'Supplier One' },
      expectedSuccess: true,
    },
    {
      name: 'Case 2: All fields with nulls',
      input: {
        name: 'Supplier Two',
        contactEmail: null,
        contactPhone: null,
        website: null,
        leadTime: null,
        defaultConditioning: null,
        notes: null,
      },
      expectedSuccess: true,
    },
    {
      name: 'Case 3: All fields with empty strings',
      input: {
        name: 'Supplier Three',
        contactEmail: '',
        contactPhone: '',
        website: '',
        leadTime: '',
        defaultConditioning: '',
        notes: '',
      },
      expectedSuccess: true,
    },
    {
      name: 'Case 4: Invalid email',
      input: {
        name: 'Supplier Four',
        contactEmail: 'invalid-email',
      },
      expectedSuccess: false,
    },
    {
      name: 'Case 5: Negative leadTime',
      input: {
        name: 'Supplier Five',
        leadTime: -5,
      },
      expectedSuccess: false,
    },
  ];

  for (const tc of testCases) {
    console.log(`Testing ${tc.name}...`);
    const sanitized = nullToUndefinedDeep(tc.input);
    const result = createSupplierSchema.safeParse(sanitized);

    if (result.success === tc.expectedSuccess) {
      console.log(`✅ Passed: ${tc.name}`);
      if (result.success) {
        console.log('   Data:', JSON.stringify(result.data));
      }
    } else {
      console.log(`❌ Failed: ${tc.name}`);
      if (!result.success) {
        console.log('   Error:', result.error.issues[0].message);
      }
    }
  }

  console.log('\n=== VERIFICATION COMPLETE ===');
}

verifySupplierFix().catch(console.error);
