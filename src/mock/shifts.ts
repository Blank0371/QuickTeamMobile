export type Shift = {
    id: string;
    title: string;
    date:string;    // YYYY-MM-DD
    start:string; //HH:MM für beide
    end:string; 
    role:string;
    coworkers: string[];
    comment:string;
}

export const businessSettings = {
    showCoworkers:true,
};

function day(offset:number){
    const d = new Date();
    d.setDate(d.getDate()+offset);
    return d.toISOString().slice(0,10);
}

export const mockShifts: Shift[] = [
  { id: "1", title: "Morning bar",  date: day(0), start: "08:00", end: "12:00",role:"bar", coworkers: ["Anna", "Jonas"],        comment: "Restock before open" },
  { id: "2", title: "Lunch service", date: day(0), start: "11:30", end: "16:00",role:"bar", coworkers: ["Mira"],                 comment: "" },
  { id: "3", title: "Evening shift", date: day(0), start: "11:00", end: "23:00", role:"bar", coworkers: ["Anna", "Leon", "Sara"], comment: "Live music, expect crowds" },
  { id: "4", title: "Prep",          date: day(3), start: "09:00", end: "13:00", role:"bar", coworkers: [],                       comment: "" },
  { id: "5", title: "Weekend rush",  date: day(5), start: "11:00", end: "20:00",role:"bar", coworkers: ["Jonas", "Mira", "Leon"],comment: "All hands" },
];