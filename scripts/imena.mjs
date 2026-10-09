/*
 * Соответствие присланных имён файлов и карточек.
 *
 * Генератор называет файлы как получится: «МИХАИЛ ФУТЛЯР» — это Коваленко,
 * «БОРИС БОРИСОВИЧ ВИШНЕВЫЙ САД» — Симеонов-Пищик, «СЕМЁН ВИШНЕВЫЙ САД» —
 * Епиходов, а «СЕМЕН ДОСТОЕВСКИЙ» — Мармеладов. Угадать это по буквам
 * нельзя, и гадать нельзя тем более: подставить чужой портрет герою — та
 * же ошибка, что подставить чужую цитату.
 *
 * Поэтому соответствия записаны руками, один раз, и проверяются скриптом:
 * каждый slug обязан существовать в базе произведений.
 *
 * Ключ — отличительное слово из имени файла в нижнем регистре. Совпадение
 * ищется по самому длинному ключу, поэтому «астахова» срабатывает раньше,
 * чем «астахов».
 */

// Произведение узнаётся по слову в имени файла
export const PROIZVEDENIYA = [
  ['отцы и дети', 'otcy-i-deti'],
  ['война и мир', 'voyna-i-mir'],
  ['вишневый сад', 'vishnevyy-sad'],
  ['вишнёвый сад', 'vishnevyy-sad'],
  ['денисович', 'odin-den-ivana-denisovicha'],
  ['дениосвич', 'odin-den-ivana-denisovicha'],
  ['достоевский', 'prestuplenie-i-nakazanie'],
  ['гвардия', 'molodaya-gvardiya'],
  ['изергиль', 'starukha-izergil'],
  ['горький', 'starukha-izergil'],
  ['на руси', 'kto-na-rusi'],
  ['русь', 'kto-na-rusi'],
  ['понедельник', 'chistyy-ponedelnik'],
  ['реквием', 'rekviem'],
  ['облако', 'oblako-v-shtanakh'],
  ['футляр', 'chelovek-v-futlyare'],
  ['франциско', 'gospodin-iz-san-francisco'],
  ['сан-франциско', 'gospodin-iz-san-francisco'],
  ['на дне', 'na-dne'],
  ['студент', 'student'],
  ['дон', 'tikhiy-don'],
  ['12', 'dvenadtsat'],
];

// Герой внутри произведения: отличительное слово → slug карточки
export const GEROI = {
  'otcy-i-deti': [
    ['базаров', 'bazarov'],
    ['аркадий', 'arkadiy'],
    ['николай кирсанов', 'nikolay-petrovich'],
    ['павел кирсанов', 'pavel-petrovich'],
  ],
  oblomov: [
    ['oblomov__oblomov', 'oblomov'],
    ['oblomov__shtolts', 'shtolts'],
    ['oblomov__olga', 'olga'],
  ],
  'vishnevyy-sad': [
    ['любовь', 'ranevskaya'],
    ['гаев', 'gaev'],
    ['лопахин', 'lopakhin'],
    ['аня', 'anya'],
    ['варя', 'varya'],
    ['трофимов', 'trofimov'],
    ['фирс', 'firs'],
    ['семён', 'epikhodov'],
    ['семен', 'epikhodov'],
    ['шарлотта', 'sharlotta'],
    ['борис борисович', 'pishchik'],
    ['яша и дуняша', 'yasha-dunyasha'],
  ],
  'kto-na-rusi': [
    ['7 мужиков', 'semero-muzhikov'],
    ['матрена', 'matryona'],
    ['матрёна', 'matryona'],
    ['савелий', 'savely'],
    ['яким', 'yakim-nagoy'],
    ['ермил', 'ermil-girin'],
    ['гриша', 'grisha'],
    ['утятин', 'posledysh'],
  ],
  'chelovek-v-futlyare': [
    ['беликов', 'belikov'],
    ['варенька', 'varenka'],
    ['михаил', 'kovalenko'],
    ['буркин', 'rasskazchiki'],
  ],
  student: [
    ['иван', 'ivan-velikopolsky'],
    ['василиса', 'vasilisa-lukerya'],
  ],
  'na-dne': [
    ['лука', 'luka'],
    ['сатин', 'satin'],
    ['васька', 'vasily-pepel'],
    ['михаил', 'kostylev'],
    ['василиса', 'vasilisa'],
    ['наташа', 'natasha'],
    ['барон', 'baron'],
    ['актёр', 'aktyor'],
    ['актер', 'aktyor'],
    ['бубнов', 'bubnov'],
    ['клещ', 'kleshch'],
    ['настя', 'nastya'],
  ],
  'prestuplenie-i-nakazanie': [
    ['родион', 'raskolnikov'],
    ['соня', 'sonya'],
    ['семен', 'marmeladov'],
    ['семён', 'marmeladov'],
    ['katerina-ivanovna', 'katerina-ivanovna'],
    ['порфирий', 'porfiry'],
    ['свидригайлов', 'svidrigaylov'],
    ['лужин', 'luzhin'],
    ['разумихин', 'razumikhin'],
    ['дуня', 'dunya'],
    ['пульхерия', 'pulkheriya'],
    ['алёна', 'alyona-ivanovna'],
    ['алена', 'alyona-ivanovna'],
    ['лиза', 'lizaveta'],
  ],
  'starukha-izergil': [
    ['изергиль горький', 'izergil'],
    ['ларра', 'larra'],
    ['данко', 'danko'],
    ['любимчики', 'lyubovniki'],
  ],
  'gospodin-iz-san-francisco': [
    ['господина', 'gospodin'],
    ['2 женщины', 'zhena-i-doch'],
    ['лоренцо', 'lorenzo-i-gortsy'],
  ],
  'chistyy-ponedelnik': [
    ['героиня', 'geroinya'],
    ['рассказчик', 'rasskazchik'],
  ],
  dvenadtsat: [
    ['гвардия 12', 'dvenadtsat-krasnoarmeytsev'],
    ['петруха', 'petrukha'],
    ['катька', 'katka'],
    ['ванька', 'vanka'],
    ['христа', 'khristos'],
    ['старый мир', 'staryy-mir'],
  ],
  'oblako-v-shtanakh': [
    ['герой', 'geroy'],
    ['мария', 'mariya'],
  ],
  rekviem: [
    ['женщины в очереди', 'zhenshchiny-v-ocheredi'],
    ['сын героини', 'syn'],
    ['героиня', 'geroinya'],
  ],
  'odin-den-ivana-denisovicha': [
    ['шухов', 'shukhov'],
    ['тюрин', 'tyurin'],
    ['цезарь', 'tsezar'],
    ['алёшка', 'alyoshka'],
    ['алешка', 'alyoshka'],
    ['буйновский', 'buynovsky'],
    ['фетюков', 'fetyukov'],
    ['гопчик', 'gopchik'],
  ],
  'voyna-i-mir': [
    ['пьер', 'pierre'],
    ['болконский', 'andrey'],
    ['балконский', 'old-bolkonsky'],
    ['наташа', 'natasha'],
    ['марья', 'marya'],
    ['николай', 'nikolay-rostov'],
    ['соня', 'sonya'],
    ['элен', 'helene'],
    ['анатолий', 'anatole'],
    ['долохов', 'dolokhov'],
    ['денисов', 'denisov'],
    ['друбецкой', 'boris'],
    ['платон', 'karataev'],
    ['михаил', 'kutuzov'],
    ['наполеон', 'napoleon'],
    ['тушин', 'tushin'],
  ],
  'tikhiy-don': [
    ['мелехов', 'grigory'],
    ['астахова', 'aksinya'],
    ['астахов', 'stepan'],
    ['коршунова', 'natalya'],
    ['пантелей', 'panteley'],
    ['ильинична', 'ilinichna'],
    ['пётр', 'petro'],
    ['петр', 'petro'],
    ['дарья', 'darya'],
    ['дуняша', 'dunyasha'],
    ['кошевой', 'mishka'],
    ['евгений', 'listnitsky'],
    ['штокман', 'shtokman'],
  ],
  'molodaya-gvardiya': [
    ['олег', 'oleg-koshevoy'],
    ['сергей', 'sergey-tyulenin'],
    ['громова', 'ulyana-gromova'],
    ['шевцова', 'lyubov-shevtsova'],
    ['шшевцова', 'lyubov-shevtsova'],
    ['земнухов', 'ivan-zemnukhov'],
    ['третьякевич', 'viktor-tretyakevich'],
    ['туркенич', 'ivan-turkenich'],
    ['борц', 'valeria-borts'],
    ['евгений', 'evgeny-stakhovich'],
    ['елена', 'elena-koshevaya'],
  ],
};

/*
 * Имена, которые генератор выдал без подсказки о герое: «Ностальгический
 * коллаж у пианино» и подобные. Такие определялись глазами, по самой
 * картинке, и записаны здесь полным именем файла.
 */
export const PO_GLAZAM = {
  // «Отцы и дети»: генератор не подписал ни одного, опознано по приметам
  // из промтов — фуксии в волосах, голубая косынка, длинная трубка.
  'аристократический портрет среди садовых фрагментов.png': ['otcy-i-deti', 'odintsova'],
  'винтажный коллаж_ нежность сквозь время.png': ['otcy-i-deti', 'fenechka'],
  'винтажный семейный коллаж на веранде.png': ['otcy-i-deti', 'roditeli-bazarova'],
  'декадентский салон в винтажном коллаже.png': ['otcy-i-deti', 'sitnikov-kukshina'],
  'ностальгический коллаж у пианино.png': ['otcy-i-deti', 'katya'],
  // Халат, диван, домашние туфли и Петербург за окном
  'сепийный коллаж_ задумчивый мужчина в будуаре.png': ['oblomov', 'oblomov'],

  // Два случая, где в имени стоит чужое произведение.
  //
  // «ОЛЕГ ДОН»: Олега в «Тихом Доне» нет, а на картинке террикон, копёр
  // шахты и юноша с тетрадью — это Олег Кошевой из «Молодой гвардии».
  'олег дон.png': ['molodaya-gvardiya', 'oleg-koshevoy'],
  // «ГВАРДИЯ 12»: не «Молодая гвардия», а двенадцать красногвардейцев Блока.
  'гвардия 12.png': ['dvenadtsat', 'dvenadtsat-krasnoarmeytsev'],
};
