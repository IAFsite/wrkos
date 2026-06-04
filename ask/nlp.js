/* ==========================================
   WRKOS NLP ENGINE
   v2
========================================== */

const NLP = {

personnel:{},
docs:[],
aliases:{},

/* ==========================================
   LOAD
========================================== */

async load(){

const [furru, archive] = await Promise.all([

fetch("../furru/data.json")
.then(r=>r.json()),

fetch("../archive/data.json")
.then(r=>r.json())

]);

this.personnel =
furru.personnel || {};

this.docs =
archive || [];

this.buildAliases();

console.log(
"[WRKOS NLP] Ready",
Object.keys(this.personnel).length,
"personnel",
this.docs.length,
"docs"
);

},

/* ==========================================
   ALIAS
========================================== */

buildAliases(){

Object.values(this.personnel)
.forEach(fp=>{

const add = value=>{

if(!value) return;

this.aliases[
value.toLowerCase()
] = fp.sn;

};

add(fp.name);
add(fp.sn);
add(fp.model);

});

},

/* ==========================================
   NORMALIZE
========================================== */

normalize(text){

let q =
text.toLowerCase().trim();

const map = {

"lihat":"show",
"liat":"show",
"lihatkan":"show",
"tampilkan":"show",
"tunjukkan":"show",
"kasih":"show",

"gambar":"photo",
"foto":"photo",
"image":"photo",
"pic":"photo",

"profil":"profile",
"tentang":"profile",
"info":"profile",

"jabatan":"role",
"kerja":"role",
"divisi":"role",

"tingginya":"height",
"tinggi":"height",

"baju":"outfit",
"kostum":"outfit",

"anggota":"member",

"siapa":"who",
"berapakah":"what",
"berapa":"what"

};

for(const k in map){

q =
q.replace(
new RegExp("\\b"+k+"\\b","g"),
map[k]
);

}

return q;

},

/* ==========================================
   ENTITY DETECT
========================================== */

findEntity(q){

let best = null;
let bestScore = 0;

Object.values(this.personnel)
.forEach(fp=>{

let score = 0;

[
fp.name,
fp.sn,
fp.model
]
.forEach(field=>{

if(
field &&
q.includes(
field.toLowerCase()
)
){
score += 10;
}

});

if(score > bestScore){

best = fp;
bestScore = score;

}

});

return best;

},

/* ==========================================
   INTENT
========================================== */

detectIntent(q){

const intents = {

photo:[
"photo",
"show photo",
"show"
],

outfit:[
"outfit"
],

role:[
"role"
],

height:[
"height"
],

profile:[
"profile",
"who"
]

};

let best = "profile";
let bestScore = 0;

for(const intent in intents){

let score = 0;

intents[intent]
.forEach(word=>{

if(q.includes(word))
score++;

});

if(score > bestScore){

best = intent;
bestScore = score;

}

}

return best;

},

/* ==========================================
   MEMBER QUERY
========================================== */

memberQuery(q){

if(!q.includes("member"))
return null;

const roles = {};

Object.values(this.personnel)
.forEach(fp=>{

if(fp.role){

roles[
fp.role.toLowerCase()
] = fp.role;

}

});

for(const roleKey in roles){

if(q.includes(roleKey)){

const members =

Object.values(this.personnel)

.filter(fp=>

(fp.role || "")
.toLowerCase()
=== roleKey

)

.map(fp=>fp.name);

return {

text:
`Anggota ${roles[roleKey]}:\n\n` +
members.join("\n"),

sources:[
roles[roleKey]
]

};

}

}

return null;

},

/* ==========================================
   RELATIONS
========================================== */

relations(fp,q){

if(
q.includes("pacar")
&&
fp.name.toLowerCase()
=== "deu"
){

return {

text:
"Berdasarkan DLOG01926112025, Deu dan Fela menjadi pasangan.",

sources:[
"DLOG01926112025"
]

};

}

return null;

},

/* ==========================================
   PERSON RESPONSE
========================================== */

buildPerson(fp,intent){

switch(intent){

case "photo":

return {

text:
`Menampilkan foto ${fp.name}.`,

image:
fp.profile,

sources:[
fp.sn
]

};

case "outfit":

return {

text:
`${fp.name} memiliki ${fp.outfits?.length || 0} outfit.`,

image:
fp.profile,

gallery:
fp.outfits || [],

sources:[
fp.sn
]

};

case "role":

return {

text:
`${fp.name} memiliki role ${fp.role}.`,

image:
fp.profile,

sources:[
fp.sn
]

};

case "height":

return {

text:
`${fp.name} memiliki tinggi ${fp.height_no_ears} cm tanpa telinga dan ${fp.height_with_ears} cm dengan telinga.`,

image:
fp.profile,

sources:[
fp.sn
]

};

default:

return {

text:

`${fp.name}

${fp.subtitle || ""}

Role : ${fp.role || "-"}
Model : ${fp.model || "-"}
Sex : ${fp.sex || "-"}
Height : ${fp.height_no_ears || "-"} cm
Deploy : ${fp.deploy || "-"}`,

image:
fp.profile,

gallery:
fp.outfits || [],

sources:[
fp.sn
]

};

}

},

/* ==========================================
   DOCUMENT SEARCH
========================================== */

searchDocs(query){

const words =
query
.toLowerCase()
.split(/\s+/);

return this.docs

.map(doc=>{

let score = 0;

words.forEach(word=>{

if(
(doc.title || "")
.toLowerCase()
.includes(word)
){
score += 10;
}

if(
(doc.content || "")
.toLowerCase()
.includes(word)
){
score += 1;
}

});

return {

...doc,
score

};

})

.filter(x=>x.score > 0)

.sort(
(a,b)=>
b.score-a.score
);

},

/* ==========================================
   MAIN ASK
========================================== */

ask(question){

if(!question)
return {

text:
"Masukkan pertanyaan.",

sources:[]
};

const q =
this.normalize(question);

/* role members */

const member =
this.memberQuery(q);

if(member)
return member;

/* person */

const fp =
this.findEntity(q);

if(fp){

const rel =
this.relations(fp,q);

if(rel)
return rel;

const intent =
this.detectIntent(q);

return this.buildPerson(
fp,
intent
);

}

/* docs */

const docs =
this.searchDocs(q);

if(docs.length){

return {

text:
docs[0]
.content
.substring(0,1200),

sources:[
docs[0].reg_id
]

};

}

/* fallback */

return {

text:
"Tidak ditemukan data yang relevan.",

sources:[]

};

}

};