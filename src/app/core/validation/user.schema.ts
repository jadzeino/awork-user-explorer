import { z } from 'zod';
import { User } from '../models/user.model';
import { ApiUserResult } from '../models/api-result.model';

const ApiLoginSchema = z.object({
  uuid: z.string().uuid(),
  username: z.string().min(1),
  password: z.string(),
  salt: z.string(),
  md5: z.string(),
  sha1: z.string(),
  sha256: z.string(),
});

const ApiNameSchema = z.object({
  title: z.string(),
  first: z.string().min(1),
  last: z.string().min(1),
});

const ApiPictureSchema = z.object({
  medium: z.string().url(),
  large: z.string().url(),
  thumbnail: z.string().url(),
});

const ApiLocationSchema = z.object({
  street: z.object({ number: z.number(), name: z.string() }),
  city: z.string().min(1),
  state: z.string(),
  country: z.string().min(1),
  postcode: z.union([z.number(), z.string()]),
});

const ApiDobSchema = z.object({
  date: z.string(),
  age: z.number().int().min(0).max(150),
});

export const ApiUserResultSchema = z.object({
  gender: z.string(),
  name: ApiNameSchema,
  email: z.string().email(),
  phone: z.string().min(1),
  picture: ApiPictureSchema,
  nat: z.string().min(2).max(2),
  login: ApiLoginSchema,
  location: ApiLocationSchema,
  dob: ApiDobSchema,
});

export const ApiResponseSchema = z.object({
  results: z.array(ApiUserResultSchema),
  info: z.object({
    seed: z.string(),
    results: z.number(),
    page: z.number(),
  }),
});

export function mapApiUserToUser(raw: ApiUserResult): User {
  return {
    id: raw.login.uuid,
    firstname: raw.name.first,
    lastname: raw.name.last,
    username: raw.login.username,
    email: raw.email,
    phone: raw.phone,
    image: `${raw.picture.medium}?id=${raw.login.uuid}`,
    nat: raw.nat,
    gender: raw.gender,
    age: raw.dob.age,
    city: raw.location.city,
    state: raw.location.state,
    country: raw.location.country,
  };
}

export function validateAndMapUsers(raw: unknown): User[] {
  const parsed = ApiResponseSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('[UserSchema] Validation errors:', parsed.error.issues);
    // Fall through with lenient parsing — reject only completely malformed records
    const lenient = (raw as { results?: ApiUserResult[] }).results ?? [];
    return lenient
      .filter(u => u?.login?.uuid && u?.name?.first && u?.email)
      .map(mapApiUserToUser);
  }
  return parsed.data.results.map(mapApiUserToUser);
}
