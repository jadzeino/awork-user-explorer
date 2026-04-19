export interface ApiName {
  title: string;
  first: string;
  last: string;
}

export interface ApiPicture {
  medium: string;
  large: string;
  thumbnail: string;
}

export interface ApiLogin {
  uuid: string;
  username: string;
  password: string;
  salt: string;
  md5: string;
  sha1: string;
  sha256: string;
}

export interface ApiLocation {
  street: { number: number; name: string };
  city: string;
  state: string;
  country: string;
  postcode: number | string;
}

export interface ApiDob {
  date: string;
  age: number;
}

export interface ApiUserResult {
  gender: string;
  name: ApiName;
  email: string;
  phone: string;
  picture: ApiPicture;
  nat: string;
  login: ApiLogin;
  location: ApiLocation;
  dob: ApiDob;
}

export interface ApiInfo {
  seed: string;
  results: number;
  page: number;
}

export interface ApiResponse {
  results: ApiUserResult[];
  info: ApiInfo;
}
