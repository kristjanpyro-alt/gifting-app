import { Person, Occasion } from '../types';

const STORAGE_KEYS = {
  PEOPLE: 'giftin_people',
  OCCASIONS: 'giftin_occasions',
  ONBOARDED: 'giftin_has_onboarded',
  USER_CITY: 'giftin_user_city',
  NOTIFICATION_TIMINGS: 'giftin_notification_timings',
};

export const StorageService = {
  getOnboarded: (): boolean => {
    return localStorage.getItem(STORAGE_KEYS.ONBOARDED) === 'true';
  },

  setOnboarded: (value: boolean) => {
    localStorage.setItem(STORAGE_KEYS.ONBOARDED, String(value));
  },

  getUserCity: (): string => {
    return localStorage.getItem(STORAGE_KEYS.USER_CITY) || '';
  },

  setUserCity: (city: string) => {
    localStorage.setItem(STORAGE_KEYS.USER_CITY, city);
  },

  getPeople: (): Person[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PEOPLE);
    return data ? JSON.parse(data) : [];
  },

  savePeople: (people: Person[]) => {
    localStorage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify(people));
  },

  getOccasions: (): Occasion[] => {
    const data = localStorage.getItem(STORAGE_KEYS.OCCASIONS);
    return data ? JSON.parse(data) : [];
  },

  saveOccasions: (occasions: Occasion[]) => {
    localStorage.setItem(STORAGE_KEYS.OCCASIONS, JSON.stringify(occasions));
  },

  addPerson: (person: Person) => {
    const people = StorageService.getPeople();
    people.push(person);
    StorageService.savePeople(people);
  },

  addOccasion: (occasion: Occasion) => {
    const occasions = StorageService.getOccasions();
    occasions.push(occasion);
    StorageService.saveOccasions(occasions);
  },

  updatePerson: (updatedPerson: Person) => {
    const people = StorageService.getPeople();
    const index = people.findIndex(p => p.id === updatedPerson.id);
    if (index !== -1) {
      people[index] = updatedPerson;
      StorageService.savePeople(people);
    }
  },

  deletePerson: (id: string) => {
    const people = StorageService.getPeople().filter(p => p.id !== id);
    StorageService.savePeople(people);
    
    const occasions = StorageService.getOccasions().filter(o => o.personId !== id);
    StorageService.saveOccasions(occasions);
  },

  deleteOccasion: (id: string) => {
    const occasions = StorageService.getOccasions().filter(o => o.id !== id);
    StorageService.saveOccasions(occasions);
  },

  updateOccasion: (updatedOccasion: Occasion) => {
    const occasions = StorageService.getOccasions();
    const index = occasions.findIndex(o => o.id === updatedOccasion.id);
    if (index !== -1) {
      occasions[index] = updatedOccasion;
      StorageService.saveOccasions(occasions);
    }
  },

  updateOccasions: (occasions: Occasion[]) => {
    StorageService.saveOccasions(occasions);
  },

  getNotificationTimings: (): number[] => {
    const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_TIMINGS);
    return data ? JSON.parse(data) : [7];
  },

  setNotificationTimings: (timings: number[]) => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATION_TIMINGS, JSON.stringify(timings));
  },
};
