# ЧАСТЬ F

# 06. Фото для генерации в ChatGPT (изображения героев)

Всего нужно 137 изображений: по одному на полную карточку героя (включая групповые). Малые карточки (54 шт.) без отдельных фото: на произведение достаточно одной общей картинки-заглушки. Остальные картинки (логотип, обложка для шаринга) уже есть на сайте.

## Как выглядят нынешние картинки (по «Старцеву»)
Кинематографичный фотореалистичный коллаж в тёплой сепии и тёмно-коричневых тонах: фигура героя, 2-3 его предмета (чемоданчик, часы, бумажки) и фрагмент места действия (вечерний город), всё вырезано рваными бумажными краями с прозрачным фоном (`heroes/cut/*.webp`).

## Разделение работы
1. Claude Code по готовому досье пишет для КАЖДОЙ карточки готовый текст-промт для ChatGPT (внешность и предметы берёт только из текста произведения, с цитатами-опорами). Вы эти промты не придумываете.
2. Вы вставляете промт в ChatGPT, генерируете изображение, прикладываете файл в чат Claude Code.
3. Claude Code сам делает рваную вырезку, прозрачный фон и webp, кладёт по пути `heroes/cut/<work-slug>__<card-slug>.webp` и подставляет в карточку. Если в репозитории уже есть скрипт нарезки, он использует его.

## Что прикладывать в ChatGPT вместе с промтом
Один из уже готовых образцов с сайта (например, Старцев), чтобы стиль совпал. Скачать: https://syuzhetnaya-dyra.github.io/heroes/cut/starcev.webp

## Требования к картинке из ChatGPT
- Вертикальный формат 2:3, одна композиция на ровном светлом нейтральном фоне (не на прозрачном: ChatGPT плохо делает прозрачность).
- Без текста, букв, логотипов и водяных знаков; без современных предметов; костюмы и вещи эпохи произведения.
- Герой без явного сходства с реальными людьми и актёрами; лицо дано как образ, не как портрет конкретного человека.
- Тёплая сепия, плёночное зерно, мягкий боковой свет, как на образце.
- Сцены насилия и крови не показывать (Раскольников, «Тихий Дон», «Реквием», «Один день Ивана Денисовича»): передавать предметами и местом.

## Промты
Готовых промтов нет: их пишет Claude Code по части G после сверки с текстом.

## Шаблон промта (Claude Code подставит детали из текста)
```
Прикреплён образец стиля. Сделай в том же стиле вертикальное изображение 2:3: кинематографичный
фотореалистичный коллаж, тёплая сепия и тёмно-коричневые тона, мягкий свет, плёночное зерно.
Герой: {имя, возраст, внешность по тексту}. Рядом 2-3 предмета: {предметы из текста}.
Фрагмент места действия: {место и время суток из текста}. Одежда эпохи: {эпоха}.
Ровный светлый однотонный фон. Без текста и логотипов, без современных предметов.
```

## Сколько картинок и в каком порядке заказывать (порядок = волны из файла 02)
| Волна | Произведения | Полных карточек (фото) |
|---|---|---|
| W1 | Отцы и дети, Обломов, Гроза, Вишнёвый сад, Кому на Руси жить хорошо, Человек в футляре, Студент, На дне | 59 |
| W2 | Преступление и наказание, Старуха Изергиль, Господин из Сан-Франциско, Чистый понедельник, Двенадцать, Облако в штанах, Реквием, Один день Ивана Денисовича | 40 |
| W3 | Война и мир, Тихий Дон, Молодая гвардия | 38 |

Совет по темпу: генерировать пачкой по одному произведению, чтобы Claude Code сразу проверил стиль и размеры на 2-3 картинках и только потом принимал остальные.

## Список карточек (имя файла = `<work-slug>__<card-slug>.webp`)

### Отцы и дети (волна 1) - 9
- `otcy-i-deti__bazarov` - Евгений Базаров (Главный герой)
- `otcy-i-deti__arkadiy` - Аркадий Кирсанов
- `otcy-i-deti__nikolay-petrovich` - Николай Петрович Кирсанов
- `otcy-i-deti__pavel-petrovich` - Павел Петрович Кирсанов
- `otcy-i-deti__odintsova` - Анна Сергеевна Одинцова
- `otcy-i-deti__katya` - Катя Локтева
- `otcy-i-deti__fenechka` - Фенечка
- `otcy-i-deti__roditeli-bazarova` - Василий Иванович и Арина Власьевна Базаровы (групповая карточка)
- `otcy-i-deti__sitnikov-kukshina` - Ситников и Кукшина (групповая карточка)

### Обломов (волна 1) - 7
- `oblomov__oblomov` - Илья Ильич Обломов (Главный герой)
- `oblomov__shtolts` - Андрей Штольц
- `oblomov__olga` - Ольга Ильинская
- `oblomov__agafya` - Агафья Пшеницына
- `oblomov__zakhar` - Захар
- `oblomov__tarantyev` - Михей Тарантьев
- `oblomov__gosti` - Гости Обломова (Волков, Судьбинский, Пенкин, Алексеев) (групповая карточка)

### Гроза (волна 1) - 8
- `groza__katerina` - Катерина Кабанова (Главная героиня)
- `groza__kabanikha` - Марфа Игнатьевна Кабанова (Кабаниха)
- `groza__tikhon` - Тихон Кабанов
- `groza__boris` - Борис Григорьевич
- `groza__dikoy` - Савёл Прокофьевич Дикой
- `groza__varvara` - Варвара
- `groza__kuligin` - Кулигин
- `groza__kudryash` - Ваня Кудряш

### Вишнёвый сад (волна 1) - 11
- `vishnevyy-sad__ranevskaya` - Любовь Андреевна Раневская (Главная героиня)
- `vishnevyy-sad__gaev` - Леонид Андреевич Гаев
- `vishnevyy-sad__lopakhin` - Ермолай Алексеевич Лопахин
- `vishnevyy-sad__anya` - Аня
- `vishnevyy-sad__varya` - Варя
- `vishnevyy-sad__trofimov` - Пётр Трофимов
- `vishnevyy-sad__firs` - Фирс
- `vishnevyy-sad__epikhodov` - Семён Епиходов
- `vishnevyy-sad__sharlotta` - Шарлотта Ивановна
- `vishnevyy-sad__pishchik` - Борис Борисович Симеонов-Пищик
- `vishnevyy-sad__yasha-dunyasha` - Яша и Дуняша (групповая карточка)

### Кому на Руси жить хорошо (волна 1) - 7
- `kto-na-rusi__semero-muzhikov` - Семь мужиков-странников (групповая карточка)
- `kto-na-rusi__matryona` - Матрёна Тимофеевна Корчагина
- `kto-na-rusi__savely` - Савелий, богатырь святорусский
- `kto-na-rusi__yakim-nagoy` - Яким Нагой
- `kto-na-rusi__ermil-girin` - Ермил Гирин
- `kto-na-rusi__grisha` - Гриша Добросклонов
- `kto-na-rusi__posledysh` - Князь Утятин (Последыш)

### Человек в футляре (волна 1) - 4
- `chelovek-v-futlyare__belikov` - Беликов (Главный герой)
- `chelovek-v-futlyare__varenka` - Варенька Коваленко
- `chelovek-v-futlyare__kovalenko` - Михаил Савич Коваленко
- `chelovek-v-futlyare__rasskazchiki` - Буркин и Иван Иванович Чимша-Гималайский (групповая карточка)

### Студент (волна 1) - 2
- `student__ivan-velikopolsky` - Иван Великопольский (Главный герой)
- `student__vasilisa-lukerya` - Василиса и Лукерья (групповая карточка)

### На дне (волна 1) - 11
- `na-dne__luka` - Лука (Ключевой герой)
- `na-dne__satin` - Сатин
- `na-dne__vasily-pepel` - Васька Пепел
- `na-dne__kostylev` - Михаил Костылёв
- `na-dne__vasilisa` - Василиса Карповна
- `na-dne__natasha` - Наташа
- `na-dne__baron` - Барон
- `na-dne__aktyor` - Актёр
- `na-dne__bubnov` - Бубнов
- `na-dne__kleshch` - Клещ и Анна (групповая карточка)
- `na-dne__nastya` - Настя

### Преступление и наказание (волна 2) - 12
- `prestuplenie-i-nakazanie__raskolnikov` - Родион Раскольников (Главный герой)
- `prestuplenie-i-nakazanie__sonya` - Соня Мармеладова
- `prestuplenie-i-nakazanie__marmeladov` - Семён Мармеладов
- `prestuplenie-i-nakazanie__katerina-ivanovna` - Катерина Ивановна Мармеладова
- `prestuplenie-i-nakazanie__porfiry` - Порфирий Петрович
- `prestuplenie-i-nakazanie__svidrigaylov` - Аркадий Свидригайлов
- `prestuplenie-i-nakazanie__luzhin` - Пётр Лужин
- `prestuplenie-i-nakazanie__razumikhin` - Дмитрий Разумихин
- `prestuplenie-i-nakazanie__dunya` - Авдотья Романовна (Дуня) Раскольникова
- `prestuplenie-i-nakazanie__pulkheriya` - Пульхерия Александровна Раскольникова
- `prestuplenie-i-nakazanie__alyona-ivanovna` - Алёна Ивановна
- `prestuplenie-i-nakazanie__lizaveta` - Лизавета Ивановна

### Старуха Изергиль (волна 2) - 5
- `starukha-izergil__izergil` - Изергиль (Главная героиня)
- `starukha-izergil__larra` - Ларра
- `starukha-izergil__danko` - Данко
- `starukha-izergil__lyubovniki` - Возлюбленные Изергиль (групповая карточка)
- `starukha-izergil__priroda` - Природа (описания: 3-4 места в тексте) (тематическая карточка, по просьбе коллеги)

### Господин из Сан-Франциско (волна 2) - 3
- `gospodin-iz-san-francisco__gospodin` - Господин из Сан-Франциско (Главный герой)
- `gospodin-iz-san-francisco__zhena-i-doch` - Жена и дочь господина
- `gospodin-iz-san-francisco__lorenzo-i-gortsy` - Лоренцо и абруццкие горцы (групповая карточка)

### Чистый понедельник (волна 2) - 2
- `chistyy-ponedelnik__geroinya` - Героиня (Главная героиня)
- `chistyy-ponedelnik__rasskazchik` - Рассказчик

### Двенадцать (волна 2) - 6
- `dvenadtsat__dvenadtsat-krasnoarmeytsev` - Двенадцать красногвардейцев (групповая карточка)
- `dvenadtsat__petrukha` - Петруха
- `dvenadtsat__katka` - Катька
- `dvenadtsat__vanka` - Ванька
- `dvenadtsat__khristos` - Христос
- `dvenadtsat__staryy-mir` - Старый мир (буржуй, писатель-вития, поп, барыня) (групповая карточка)

### Облако в штанах (волна 2) - 2
- `oblako-v-shtanakh__geroy` - Лирический герой
- `oblako-v-shtanakh__mariya` - Мария

### Реквием (волна 2) - 3
- `rekviem__geroinya` - Лирическая героиня
- `rekviem__syn` - Сын
- `rekviem__zhenshchiny-v-ocheredi` - Женщины в тюремной очереди (групповая карточка)

### Один день Ивана Денисовича (волна 2) - 7
- `odin-den-ivana-denisovicha__shukhov` - Иван Денисович Шухов (Главный герой)
- `odin-den-ivana-denisovicha__tyurin` - Бригадир Тюрин
- `odin-den-ivana-denisovicha__tsezar` - Цезарь Маркович
- `odin-den-ivana-denisovicha__alyoshka` - Алёшка-баптист
- `odin-den-ivana-denisovicha__buynovsky` - Капитан Буйновский
- `odin-den-ivana-denisovicha__fetyukov` - Фетюков
- `odin-den-ivana-denisovicha__gopchik` - Гопчик

### Война и мир (волна 3) - 16
- `voyna-i-mir__pierre` - Пьер Безухов (Главный герой)
- `voyna-i-mir__andrey` - Андрей Болконский
- `voyna-i-mir__natasha` - Наташа Ростова
- `voyna-i-mir__marya` - Марья Болконская
- `voyna-i-mir__nikolay-rostov` - Николай Ростов
- `voyna-i-mir__sonya` - Соня
- `voyna-i-mir__helene` - Элен Курагина
- `voyna-i-mir__anatole` - Анатоль Курагин
- `voyna-i-mir__old-bolkonsky` - Николай Андреевич Болконский
- `voyna-i-mir__dolokhov` - Фёдор Долохов
- `voyna-i-mir__denisov` - Василий Денисов
- `voyna-i-mir__boris` - Борис Друбецкой
- `voyna-i-mir__karataev` - Платон Каратаев
- `voyna-i-mir__kutuzov` - Михаил Илларионович Кутузов
- `voyna-i-mir__napoleon` - Наполеон
- `voyna-i-mir__tushin` - Капитан Тушин

### Тихий Дон (волна 3) - 12
- `tikhiy-don__grigory` - Григорий Мелехов (Главный герой)
- `tikhiy-don__aksinya` - Аксинья Астахова
- `tikhiy-don__natalya` - Наталья Коршунова
- `tikhiy-don__panteley` - Пантелей Прокофьевич Мелехов
- `tikhiy-don__ilinichna` - Ильинична
- `tikhiy-don__petro` - Пётр Мелехов
- `tikhiy-don__darya` - Дарья Мелехова
- `tikhiy-don__dunyasha` - Дуняшка Мелехова
- `tikhiy-don__mishka` - Михаил Кошевой
- `tikhiy-don__stepan` - Степан Астахов
- `tikhiy-don__listnitsky` - Евгений Листницкий
- `tikhiy-don__shtokman` - Осип Штокман

### Молодая гвардия (волна 3) - 10
- `molodaya-gvardiya__oleg-koshevoy` - Олег Кошевой (Главный герой)
- `molodaya-gvardiya__sergey-tyulenin` - Сергей Тюленин
- `molodaya-gvardiya__ulyana-gromova` - Ульяна Громова
- `molodaya-gvardiya__lyubov-shevtsova` - Любовь Шевцова
- `molodaya-gvardiya__ivan-zemnukhov` - Иван Земнухов
- `molodaya-gvardiya__viktor-tretyakevich` - Виктор Третьякевич
- `molodaya-gvardiya__ivan-turkenich` - Иван Туркенич
- `molodaya-gvardiya__valeria-borts` - Валерия Борц
- `molodaya-gvardiya__evgeny-stakhovich` - Евгений Стахович
- `molodaya-gvardiya__elena-koshevaya` - Елена Николаевна Кошевая
