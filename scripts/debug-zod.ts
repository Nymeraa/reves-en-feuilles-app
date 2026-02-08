import { z } from 'zod';

const schema = z.object({
    name: z.string()
});

console.log('Testing Zod Error Structure...');
const result = schema.safeParse({});
if (!result.success) {
    console.log('Success: false');
    console.log('Error keys:', Object.keys(result.error));
    // console.log('Error json:', JSON.stringify(result.error, null, 2)); // might contain circular?
    console.log('Has .errors?', 'errors' in result.error);
    console.log('Has .issues?', 'issues' in result.error);
    if ('issues' in result.error) {
        console.log('.issues items:', JSON.stringify((result.error as any).issues, null, 2));
    }
} else {
    console.log('Success: true (Unexpected)');
}
