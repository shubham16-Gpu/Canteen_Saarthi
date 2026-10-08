const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({select:{email:true,role:true,isActive:true},orderBy:[{role:'asc'},{email:'asc'}],take:50}).then(u=>{console.log(JSON.stringify(u,null,2));return p.$disconnect();}).catch(e=>{console.error(e.message);process.exit(1);});
