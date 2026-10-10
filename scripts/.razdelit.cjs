const sharp=require('sharp'),fs=require('fs'),path=require('path');
const D=process.argv[1];
(async()=>{
  let ubrano=0, ostalos=0;
  for (const f of fs.readdirSync(D).filter(x=>/\.(png|jpg|jpeg|webp)$/i.test(x))) {
    const m=await sharp(path.join(D,f)).metadata();
    if (m.width/m.height > 1.2) { ostalos++; continue; }
    fs.renameSync(path.join(D,f), path.join(D,'разобрано',f));
    ubrano++;
  }
  console.log('карточек убрано в «разобрано»: '+ubrano);
  console.log('экранов осталось в работе: '+ostalos);
})();
