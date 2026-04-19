export interface User {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  phone: string;
  image: string;
  nat: string;
  gender: string;
  age: number;
  city: string;
  country: string;
}

export type GroupBy = 'letter' | 'age' | 'nationality';

export interface UserGroup {
  key: string;
  label: string;
  users: User[];
}

export interface GroupingResult {
  groups: UserGroup[];
  totalCount: number;
}
