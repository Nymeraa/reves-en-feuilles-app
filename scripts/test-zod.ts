import { z } from 'zod';

const schema = z
  .preprocess((val) => (val === '' || val === null ? undefined : val), z.coerce.number().min(0))
  .optional();

console.log('undefined ->', schema.safeParse(undefined).success);
console.log('null ->', schema.safeParse(null).success);
console.log('"" ->', schema.safeParse('').success);
console.log('5 ->', schema.safeParse(5).success);
console.log('"5" ->', schema.safeParse('5').success);
console.log('null errors ->', JSON.stringify(schema.safeParse(null)));
