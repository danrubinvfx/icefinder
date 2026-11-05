export interface FacilityContact {
  slug: string;
  name: string;
  phone: string;
  scheduleUrl: string;
}

export const FACILITY_CONTACTS: Record<string, FacilityContact> = {
  // Burnaby
  'rosemary-brown': {
    slug: 'rosemary-brown',
    name: 'Rosemary Brown Recreation Centre',
    phone: '(604) 297-4522',
    scheduleUrl: 'https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&center_ids=180&viewMode=list'
  },
  'kensington': {
    slug: 'kensington',
    name: 'Kensington Complex',
    phone: '(604) 297-4520',
    scheduleUrl: 'https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&center_ids=147&viewMode=list'
  },
  'bill-copeland': {
    slug: 'bill-copeland',
    name: 'Bill Copeland Sports Centre',
    phone: '(604) 297-4521',
    scheduleUrl: 'https://anc.ca.apm.activecommunities.com/burnaby/activity/search?onlineSiteId=0&center_ids=146&viewMode=list'
  },
  'scotia-barn': {
    slug: 'scotia-barn',
    name: 'Scotia Barn (Canlan Sports)',
    phone: '(604) 291-0626',
    scheduleUrl: 'https://apps.daysmartrecreation.com/dash/x/#/online/canlan/programs?facility_ids=1'
  },
  // Coquitlam
  'poirier': {
    slug: 'poirier',
    name: 'Poirier Sport & Leisure Complex',
    phone: '(604) 927-6027',
    scheduleUrl: '/schedules/coquitlam-poirier'
  },
  // Delta
  'sungod': {
    slug: 'sungod',
    name: 'Sungod Recreation Centre',
    phone: '(604) 952-3075',
    scheduleUrl: 'https://cityofdelta.perfectmind.com/24140/Clients/BookMe4BookingPages/Classes?calendarId=c9b7ca71-56dc-43e3-aec7-d976239a5660&widgetId=0da93182-93fb-4314-87bd-a8ba4ee9a4c9&embed=False'
  },
  'north-delta': {
    slug: 'north-delta',
    name: 'North Delta Recreation Centre',
    phone: '(604) 952-3045',
    scheduleUrl: 'https://cityofdelta.perfectmind.com/24140/Clients/BookMe4BookingPages/Classes?calendarId=c9b7ca71-56dc-43e3-aec7-d976239a5660&widgetId=0da93182-93fb-4314-87bd-a8ba4ee9a4c9&embed=False'
  },
  'south-delta': {
    slug: 'south-delta',
    name: 'South Delta Recreation Centre',
    phone: '(604) 952-3020',
    scheduleUrl: 'https://cityofdelta.perfectmind.com/24140/Clients/BookMe4BookingPages/Classes?calendarId=c9b7ca71-56dc-43e3-aec7-d976239a5660&widgetId=0da93182-93fb-4314-87bd-a8ba4ee9a4c9&embed=False'
  },
  'tilbury': {
    slug: 'tilbury',
    name: 'Tilbury Ice',
    phone: '(604) 952-3000',
    scheduleUrl: 'https://cityofdelta.perfectmind.com/24140/Clients/BookMe4BookingPages/Classes?calendarId=c9b7ca71-56dc-43e3-aec7-d976239a5660&widgetId=0da93182-93fb-4314-87bd-a8ba4ee9a4c9&embed=False'
  },
  // North Vancouver (NVRC)
  'harry-jerome': {
    slug: 'harry-jerome',
    name: 'Harry Jerome Community Recreation Centre',
    phone: '(604) 987-7529',
    scheduleUrl: 'https://www.nvrc.ca/skating'
  },
  'karen-magnussen': {
    slug: 'karen-magnussen',
    name: 'Karen Magnussen Community Recreation Centre',
    phone: '(604) 987-7529',
    scheduleUrl: 'https://www.nvrc.ca/skating'
  },
  // Richmond
  'richmond-ice-centre': {
    slug: 'richmond-ice-centre',
    name: 'Richmond Ice Centre',
    phone: '(604) 448-5366',
    scheduleUrl: 'https://richmondcity.perfectmind.com/23650/Clients/BookMe4?widgetId=15f6af07-39c5-473e-b053-96653f77a406'
  },
  'minoru': {
    slug: 'minoru',
    name: 'Minoru Arenas',
    phone: '(604) 238-8465',
    scheduleUrl: 'https://richmondcity.perfectmind.com/23650/Clients/BookMe4?widgetId=15f6af07-39c5-473e-b053-96653f77a406'
  },
  // Vancouver (Park Board)
  'britannia': { slug: 'britannia', name: 'Britannia Rink', phone: '(604) 718-5800', scheduleUrl: 'https://anc.ca.apm.activecommunities.com/vancouver/calendars?defaultCalendarId=3' },
  'hillcrest': { slug: 'hillcrest', name: 'Hillcrest Rink', phone: '(604) 257-8680', scheduleUrl: 'https://anc.ca.apm.activecommunities.com/vancouver/calendars?defaultCalendarId=3' },
  'kitsilano': { slug: 'kitsilano', name: 'Kitsilano Rink', phone: '(604) 257-6976', scheduleUrl: 'https://anc.ca.apm.activecommunities.com/vancouver/calendars?defaultCalendarId=3' },
  'trout-lake': { slug: 'trout-lake', name: 'Trout Lake Rink', phone: '(604) 257-6955', scheduleUrl: 'https://anc.ca.apm.activecommunities.com/vancouver/calendars?defaultCalendarId=3' },
  'sunset': { slug: 'sunset', name: 'Sunset Rink', phone: '(604) 718-6505', scheduleUrl: 'https://anc.ca.apm.activecommunities.com/vancouver/calendars?defaultCalendarId=3' },
  'killarney': { slug: 'killarney', name: 'Killarney Rink', phone: '(604) 718-8280', scheduleUrl: 'https://anc.ca.apm.activecommunities.com/vancouver/calendars?defaultCalendarId=3' },
  // West Vancouver & New Westminster
  'west-vancouver-arena': { slug: 'west-vancouver-arena', name: 'West Vancouver Ice Arena', phone: '(604) 925-7270', scheduleUrl: 'https://westvancouver.ca/skating' },
  'moody-park': { slug: 'moody-park', name: 'Moody Park Arena', phone: '(604) 525-5301', scheduleUrl: 'https://www.newwestcity.ca/skating' },
  // Langley (Township of Langley)
  'george-preston': {
    slug: 'george-preston',
    name: 'George Preston Recreation Centre',
    phone: '(604) 534-3266',
    scheduleUrl: 'https://www.tol.ca/en/recreation-culture/skating.aspx'
  },
  'aldergrove-cucc': {
    slug: 'aldergrove-cucc',
    name: 'Aldergrove Credit Union Community Centre',
    phone: '(604) 857-4299',
    scheduleUrl: 'https://www.tol.ca/en/recreation-culture/skating.aspx'
  },
  // Surrey
  'north-surrey': {
    slug: 'north-surrey',
    name: 'North Surrey Sport & Ice Complex',
    phone: '(604) 502-6300',
    scheduleUrl: 'https://cityofsurrey.perfectmind.com/23615/Clients/BookMe4BookingPages/Classes?calendarId=5b599b6d-d54f-43c1-b86a-e962d9bf107b&widgetId=b4059e75-9755-401f-a7b5-d7c75361420d&embed=False'
  },
  'surrey-sport-leisure': {
    slug: 'surrey-sport-leisure',
    name: 'Surrey Sport & Leisure Complex',
    phone: '(604) 501-5950',
    scheduleUrl: 'https://cityofsurrey.perfectmind.com/23615/Clients/BookMe4BookingPages/Classes?calendarId=5b599b6d-d54f-43c1-b86a-e962d9bf107b&widgetId=b4059e75-9755-401f-a7b5-d7c75361420d&embed=False'
  },
  'cloverdale-ice': {
    slug: 'cloverdale-ice',
    name: 'Cloverdale Sport & Ice Complex',
    phone: '(604) 598-7960',
    scheduleUrl: 'https://cityofsurrey.perfectmind.com/23615/Clients/BookMe4BookingPages/Classes?calendarId=5b599b6d-d54f-43c1-b86a-e962d9bf107b&widgetId=b4059e75-9755-401f-a7b5-d7c75361420d&embed=False'
  },
  'south-surrey': {
    slug: 'south-surrey',
    name: 'South Surrey Arena',
    phone: '(604) 502-6201',
    scheduleUrl: 'https://cityofsurrey.perfectmind.com/23615/Clients/BookMe4BookingPages/Classes?calendarId=5b599b6d-d54f-43c1-b86a-e962d9bf107b&widgetId=b4059e75-9755-401f-a7b5-d7c75361420d&embed=False'
  },
  'newton-arena': {
    slug: 'newton-arena',
    name: 'Newton Arena',
    phone: '(604) 501-5544',
    scheduleUrl: 'https://cityofsurrey.perfectmind.com/23615/Clients/BookMe4BookingPages/Classes?calendarId=5b599b6d-d54f-43c1-b86a-e962d9bf107b&widgetId=b4059e75-9755-401f-a7b5-d7c75361420d&embed=False'
  },
  // Planet Ice
  'planet-ice-coquitlam': {
    slug: 'planet-ice-coquitlam',
    name: 'Planet Ice Coquitlam',
    phone: '(604) 941-9911',
    scheduleUrl: 'https://apps.daysmartrecreation.com/dash/x/#/online/planetice/programs?facility_ids=3'
  },
  'planet-ice-delta': {
    slug: 'planet-ice-delta',
    name: 'Planet Ice Delta',
    phone: '(604) 930-8727',
    scheduleUrl: 'https://apps.daysmartrecreation.com/dash/x/#/online/planetice/programs?facility_ids=5'
  },
  'planet-ice-maple-ridge': {
    slug: 'planet-ice-maple-ridge',
    name: 'Planet Ice Maple Ridge',
    phone: '(604) 467-2883',
    scheduleUrl: 'https://apps.daysmartrecreation.com/dash/x/#/online/planetice/programs?facility_ids=4'
  }
};

export function getFacilityContact(slug?: string | null): FacilityContact | undefined {
  if (!slug) return undefined;
  return FACILITY_CONTACTS[slug];
}

export function getFacilityPhone(slug?: string | null): string | undefined {
  return getFacilityContact(slug)?.phone;
}

export function getFacilityScheduleUrl(slug?: string | null): string | undefined {
  return getFacilityContact(slug)?.scheduleUrl;
}

export const FACILITY_SHEETS: Record<string, number> = {
  'rosemary-brown': 2,
  'kensington': 1,
  'bill-copeland': 1,
  'scotia-barn': 6,
  'poirier': 3,
  'sungod': 1,
  'north-delta': 1,
  'south-delta': 1,
  'tilbury': 2,
  'harry-jerome': 1,
  'karen-magnussen': 1,
  'richmond-ice-centre': 6,
  'minoru': 2,
  'britannia': 1,
  'hillcrest': 1,
  'kitsilano': 1,
  'trout-lake': 1,
  'sunset': 1,
  'killarney': 1,
  'west-vancouver-arena': 1,
  'moody-park': 1,
  'george-preston': 1,
  'aldergrove-cucc': 1,
  'north-surrey': 3,
  'surrey-sport-leisure': 3,
  'cloverdale-ice': 2,
  'south-surrey': 1,
  'newton-arena': 1,
  'planet-ice-coquitlam': 4,
  'planet-ice-delta': 4,
  'planet-ice-maple-ridge': 2,
};

export function getFacilitySheets(slug?: string | null): number | undefined {
  if (!slug) return undefined;
  return FACILITY_SHEETS[slug];
}
