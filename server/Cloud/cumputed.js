/*
 * @Author: Json.Xu
 * @Date: 2020-03-09 14:06:19
 * @LastEditTime: 2020-12-21 09:59:01
 * @LastEditors: Json.Xu
 * @Description:
 * @FilePath: \vue_vuetify_parseserver\server\Cloud\cumputed.js
 */
// 计算概率 胜平负的概率，依赖返回率，凯利 大小球的概率，依赖返回率， 亚盘的概率，依赖返回率 最近战绩和历史战绩 赔率转换成概率公式 概率 = 1 /
// 赔率
// * 赔付率 凯利 = 赔率 * 平博概率 赔付率大于凯利指数后 就是赔付差 3%是可以接受范围

/**************
 *
 * 返还率   = 1/(1/胜赔+1/平赔+1/负赔)
 * 概率     = 1/赔率X返还率
 * 凯利指数调整 = 赔率/平均赔率*平均返回率
 * 概率从某种意义上讲，就相当于投注的资金
 * 威廉和竞彩的三项数据差距 小的一面
 * 按5% 作为浮动机制
 * 一场800，胜平负400，大小球300，，半场300，比分100
 *
 * **************/

const colors = require('colors');
const math = require('mathjs');

Parse
    .Cloud
    .define("cpu", async (request) => {

      
       

        console.clear();
        var date = new Date();
        var year = date.getFullYear();
        var month = date.getMonth() + 1;
        var day = date.getDate();
        var datetemp = year + "-" + month + "-" + day;
        if (month < 10) {
            datetemp = year + "-0" + month + "-0" + day;
        }

        datetemp = "2020-12-21"


        var tempMoney = Parse
            .Object
            .extend("Money");
        var query = new Parse.Query(tempMoney);
        query.equalTo("date", datetemp);
        query.notEqualTo("displayState", "完场")
        query.ascending("matchTime") //matchTime,league
        // query.greaterThan("matchTime",new Date());
        query.limit(500);
        const items = await query.find();

        for (let index = 0; index < items.length; index++) {
            
            const element = items[index];
            
            let OneResult = Parse
                .Object
                .extend("OneResult");
            let oneresult = new OneResult();

            oneresult.set("date", datetemp);

            let matchId = element.get('matchId');

            oneresult.set("matchId", matchId);
            // if (matchId != "243746778") {     continue; }

            const OddsMoney = Parse
                .Object
                .extend("OddsMoney");

            const query = new Parse.Query(OddsMoney);

            query.equalTo("matchId", matchId);

            query.limit(1);

            const results = await query.first();

            if (results == undefined) {
                continue;
            }

            const home = element.get('home');
            const guest = element.get('guest');

            oneresult.set("home", home);
            oneresult.set("guest", guest);

            // 获取到赔率（odds），获取到概率(ratio),获取到返回率（returnRatio）,获取到凯利（kelly）
            // 以威廉的概率为基准线，进行第一轮的5%的浮动
            let finalitem = ['0%', '0%', '0%'];
            let justitem = ['0%', '0%', '0%'];
            let ouzhuanya = finalitem;

            let weilianitem = results.get('weilian');

            // 过滤体彩 if (results.get('ticai') == undefined) {     continue; }
            if (weilianitem != undefined && weilianitem != null) {
                //带入威廉的概率
                finalitem = [weilianitem.ratio[0], weilianitem.ratio[1], weilianitem.ratio[2]];
                ouzhuanya = [weilianitem.ratio[0], weilianitem.ratio[1], weilianitem.ratio[2]];
                justitem = [weilianitem.ratio[0], weilianitem.ratio[1], weilianitem.ratio[2]];

            } else {

                console.log("缺少威廉数据");
                continue
            }

            // 进行第二轮bet365的5%的浮动

            let bet365item = results.get('bet365');

            if (bet365item != undefined && bet365item != null) {
                //如果威廉数据为空，带入bet365的数据
                if (weilianitem == undefined || weilianitem == null) {
                    //带入bet365的概率
                    finalitem = [bet365item.ratio[0], bet365item.ratio[1], bet365item.ratio[2]];
                    ouzhuanya = [bet365item.ratio[0], bet365item.ratio[1], bet365item.ratio[2]];
                    justitem = [bet365item.ratio[0], bet365item.ratio[1], bet365item.ratio[2]];

                }
            } else {
                if (weilianitem == undefined || weilianitem == null) {
                    console.log("缺少bet365的数据");
                    continue;
                }
            }

            console.log('开局====:'.red + finalitem);
            oneresult.set("test1", '开局====:' + finalitem);
            //新的方案。欧盘转亚盘


            //进行第三轮bet10的5%的浮动
            let bet10item = results.get('bet10');
            let averageitem = results.get('average');

            if (bet10item != undefined && bet10item != null) {

                bet10item.returnRatio = math.format(bet10item.returnRatio.replace('%', '') / 100, 3);

                //计算凯利  赔率/平均赔率*平均返回率
                const k1 = math.format(bet10item.odds[0] / averageitem.odds[0] * parseFloat(averageitem.returnRatio.replace('%', '') / 100), 4);
                const k2 = math.format(bet10item.odds[1] / averageitem.odds[1] * parseFloat(averageitem.returnRatio.replace('%', '') / 100), 4);
                const k3 = math.format(bet10item.odds[2] / averageitem.odds[2] * parseFloat(averageitem.returnRatio.replace('%', '') / 100), 4);

                if (parseFloat(bet10item.returnRatio) > parseFloat(k1)) {
                    justitem[0] = math.evaluate(parseFloat(justitem[0].replace('%', '')) + 10) + '%';
                    justitem[1] = math.evaluate(parseFloat(justitem[1].replace('%', '')) - 5) + '%';
                    justitem[2] = math.evaluate(parseFloat(justitem[2].replace('%', '')) - 5) + '%';
                }

                if (parseFloat(bet10item.returnRatio) > parseFloat(k2)) {
                    justitem[0] = math.evaluate(parseFloat(justitem[0].replace('%', '')) - 5) + '%';
                    justitem[1] = math.evaluate(parseFloat(justitem[1].replace('%', '')) + 10) + '%';
                    justitem[2] = math.evaluate(parseFloat(justitem[2].replace('%', '')) - 5) + '%';
                }

                if (parseFloat(bet10item.returnRatio) > parseFloat(k3)) {

                    justitem[0] = math.evaluate(parseFloat(justitem[0].replace('%', '')) - 5) + '%';
                    justitem[1] = math.evaluate(parseFloat(justitem[1].replace('%', '')) - 5) + '%';
                    justitem[2] = math.evaluate(parseFloat(justitem[2].replace('%', '')) + 10) + '%';
                }
            }

            //进行第四轮体彩的5%浮动，体彩是换一种方式进行对比，本身因为大抽水，导致赔率偏低，但是又要符合市场规律，很可能是要做出赔率。
            let ticaiitem = results.get('ticai');

            // if (ticaiitem == undefined) {     continue; }

            console.log(element.get('league') + "----" + home + "(" + element.get('homeRank') + ")" + '  vs  ' + guest + "(" + element.get('guestRank') + ")" + "-----" + element.get('matchId') + "-----" + element.get('matchTime'));
            
            oneresult.set("test2", element.get('league') + "----" + home + "(" + element.get('homeRank') + ")" + '  vs  ' + guest + "(" + element.get('guestRank') + ")" + "-----" + element.get('matchId') + "-----" + element.get('matchTime'));
            
            console.log('凯利:'.red + justitem);

            oneresult.set("test3", '凯利:' + justitem);
           
            if (ticaiitem != undefined && ticaiitem != null) {
                //算出差距
                let chaju0 = math.format(weilianitem.odds[0] - ticaiitem.odds[0], 3);
                let chaju1 = math.format(weilianitem.odds[1] - ticaiitem.odds[1], 3);
                let chaju2 = math.format(weilianitem.odds[2] - ticaiitem.odds[2], 3);

                if (chaju0 < 0) {
                    justitem[0] = math.evaluate(parseFloat(justitem[0].replace('%', '')) - 10) + '%';
                    justitem[1] = math.evaluate(parseFloat(justitem[1].replace('%', '')) + 5) + '%';
                    justitem[2] = math.evaluate(parseFloat(justitem[2].replace('%', '')) + 5) + '%';
                }
                if (chaju1 < 0) {
                    justitem[0] = math.evaluate(parseFloat(justitem[0].replace('%', '')) + 5) + '%';
                    justitem[1] = math.evaluate(parseFloat(justitem[1].replace('%', '')) - 10) + '%';
                    justitem[2] = math.evaluate(parseFloat(justitem[2].replace('%', '')) + 5) + '%';
                }
                if (chaju2 < 0) {
                    justitem[0] = math.evaluate(parseFloat(justitem[0].replace('%', '')) + 5) + '%';
                    justitem[1] = math.evaluate(parseFloat(justitem[1].replace('%', '')) + 5) + '%';
                    justitem[2] = math.evaluate(parseFloat(justitem[2].replace('%', '')) - 10) + '%';
                }

                if (chaju0 >= 0 && chaju1 >= 0 && chaju2 >= 0) {
                    if (chaju0 <= chaju1 || chaju0 <= chaju2) {
                        justitem[0] = math.evaluate(parseFloat(justitem[0].replace('%', '')) + 10) + '%';
                        justitem[1] = math.evaluate(parseFloat(justitem[1].replace('%', '')) - 5) + '%';
                        justitem[2] = math.evaluate(parseFloat(justitem[2].replace('%', '')) - 5) + '%';
                    }
                    if (chaju1 <= chaju2 || chaju1 <= chaju0) {
                        justitem[0] = math.evaluate(parseFloat(justitem[0].replace('%', '')) - 5) + '%';
                        justitem[1] = math.evaluate(parseFloat(justitem[1].replace('%', '')) + 10) + '%';
                        justitem[2] = math.evaluate(parseFloat(justitem[2].replace('%', '')) - 5) + '%';
                    }

                    if (chaju2 <= chaju1 || chaju2 <= chaju0) {
                        justitem[0] = math.evaluate(parseFloat(justitem[0].replace('%', '')) - 5) + '%';
                        justitem[1] = math.evaluate(parseFloat(justitem[1].replace('%', '')) - 5) + '%';
                        justitem[2] = math.evaluate(parseFloat(justitem[2].replace('%', '')) + 10) + '%';
                    }

                }

                console.log('体彩:'.red + justitem);
                
                oneresult.set("test4", '体彩:' + justitem);
            }



            //进行第5轮的5%的浮动，主要是针对平局进行处理。
            const HistoryMoney = Parse
                .Object
                .extend("HistoryMoney");

            const historyquery = new Parse.Query(HistoryMoney);

            historyquery.equalTo("matchId", matchId);

            historyquery.limit(1);

            const historyitems = await historyquery.first();

            if (historyitems == undefined) {
                continue;
            }

            let historylist = historyitems.get('againstlist')

            for (let index = 0; index < historylist.length; index++) {
                const element = historylist[index];
                if (index < 2) {
                    if (home == element.home && guest == element.guest) {
                        if (element.goal[0] > element.goal[1]) {
                            finalitem[0] = math.evaluate(parseFloat(finalitem[0].replace('%', '')) + 10) + '%';
                            finalitem[1] = math.evaluate(parseFloat(finalitem[1].replace('%', '')) - 5) + '%';
                            finalitem[2] = math.evaluate(parseFloat(finalitem[2].replace('%', '')) - 5) + '%';
                        }
                        if (element.goal[0] == element.goal[1]) {
                            finalitem[0] = math.evaluate(parseFloat(finalitem[0].replace('%', '')) - 5) + '%';
                            finalitem[1] = math.evaluate(parseFloat(finalitem[1].replace('%', '')) + 10) + '%';
                            finalitem[2] = math.evaluate(parseFloat(finalitem[2].replace('%', '')) - 5) + '%';
                        }
                        if (element.goal[0] < element.goal[1]) {
                            finalitem[0] = math.evaluate(parseFloat(finalitem[0].replace('%', '')) - 10) + '%';
                            finalitem[1] = math.evaluate(parseFloat(finalitem[1].replace('%', '')) - 5) + '%';
                            finalitem[2] = math.evaluate(parseFloat(finalitem[2].replace('%', '')) + 15) + '%';
                        }
                    }
                    if (home == element.guest && guest == element.home) {
                        if (element.goal[0] < element.goal[1]) {
                            finalitem[0] = math.evaluate(parseFloat(finalitem[0].replace('%', '')) + 10) + '%';
                            finalitem[1] = math.evaluate(parseFloat(finalitem[1].replace('%', '')) + 5) + '%';
                            finalitem[2] = math.evaluate(parseFloat(finalitem[2].replace('%', '')) - 15) + '%';
                        }
                        if (element.goal[0] == element.goal[1]) {
                            finalitem[0] = math.evaluate(parseFloat(finalitem[0].replace('%', '')) - 5) + '%';
                            finalitem[1] = math.evaluate(parseFloat(finalitem[1].replace('%', '')) + 10) + '%';
                            finalitem[2] = math.evaluate(parseFloat(finalitem[2].replace('%', '')) - 5) + '%';
                        }
                        if (element.goal[0] > element.goal[1]) {
                            finalitem[0] = math.evaluate(parseFloat(finalitem[0].replace('%', '')) - 5) + '%';
                            finalitem[1] = math.evaluate(parseFloat(finalitem[1].replace('%', '')) - 5) + '%';
                            finalitem[2] = math.evaluate(parseFloat(finalitem[2].replace('%', '')) + 10) + '%';
                        }
                    }
                } else {
                    break;
                }

            }

            console.log('两队历史:'.green + finalitem);
           
            oneresult.set("test5", '两队历史:' + finalitem);

            //进行第6轮的5 % 的浮动，主要是针对最近状态进行处理。
            let homelist = historyitems.get('homelist')
            for (let index = 0; index < homelist.length; index++) {
                const element = homelist[index];
                if (index < 2) {
                    if (home == element.home) {
                        if (element.goal[0] > element.goal[1]) {
                            finalitem[0] = math.evaluate(parseFloat(finalitem[0].replace('%', '')) + 10) + '%';
                            finalitem[1] = math.evaluate(parseFloat(finalitem[1].replace('%', '')) - 5) + '%';
                            finalitem[2] = math.evaluate(parseFloat(finalitem[2].replace('%', '')) - 5) + '%';
                        }
                        if (element.goal[0] == element.goal[1]) {
                            finalitem[0] = math.evaluate(parseFloat(finalitem[0].replace('%', '')) - 5) + '%';
                            finalitem[1] = math.evaluate(parseFloat(finalitem[1].replace('%', '')) + 10) + '%';
                            finalitem[2] = math.evaluate(parseFloat(finalitem[2].replace('%', '')) - 5) + '%';
                        }
                        if (element.goal[0] < element.goal[1]) {
                            finalitem[0] = math.evaluate(parseFloat(finalitem[0].replace('%', '')) - 5) + '%';
                            finalitem[1] = math.evaluate(parseFloat(finalitem[1].replace('%', '')) - 5) + '%';
                            finalitem[2] = math.evaluate(parseFloat(finalitem[2].replace('%', '')) + 10) + '%';
                        }
                    }
                    if (home == element.guest) {
                        if (element.goal[0] < element.goal[1]) {
                            finalitem[0] = math.evaluate(parseFloat(finalitem[0].replace('%', '')) + 10) + '%';
                            finalitem[1] = math.evaluate(parseFloat(finalitem[1].replace('%', '')) - 5) + '%';
                            finalitem[2] = math.evaluate(parseFloat(finalitem[2].replace('%', '')) - 5) + '%';
                        }
                        if (element.goal[0] == element.goal[1]) {
                            finalitem[0] = math.evaluate(parseFloat(finalitem[0].replace('%', '')) - 5) + '%';
                            finalitem[1] = math.evaluate(parseFloat(finalitem[1].replace('%', '')) + 10) + '%';
                            finalitem[2] = math.evaluate(parseFloat(finalitem[2].replace('%', '')) - 5) + '%';
                        }
                        if (element.goal[0] > element.goal[1]) {
                            finalitem[0] = math.evaluate(parseFloat(finalitem[0].replace('%', '')) - 5) + '%';
                            finalitem[1] = math.evaluate(parseFloat(finalitem[1].replace('%', '')) - 5) + '%';
                            finalitem[2] = math.evaluate(parseFloat(finalitem[2].replace('%', '')) + 10) + '%';
                        }
                    }
                    // console.log( "----------"+finalitem)
                } else {
                    break;
                };
            }
            let guestlist = historyitems.get('guestlist')
            for (let index = 0; index < guestlist.length; index++) {
                const element = guestlist[index];
                if (index < 2) {
                    if (guest == element.home) {
                        if (element.goal[0] > element.goal[1]) {
                            finalitem[0] = math.evaluate(parseFloat(finalitem[0].replace('%', '')) - 5) + '%';
                            finalitem[1] = math.evaluate(parseFloat(finalitem[1].replace('%', '')) - 5) + '%';
                            finalitem[2] = math.evaluate(parseFloat(finalitem[2].replace('%', '')) + 10) + '%';
                        }
                        if (element.goal[0] == element.goal[1]) {
                            finalitem[0] = math.evaluate(parseFloat(finalitem[0].replace('%', '')) - 5) + '%';
                            finalitem[1] = math.evaluate(parseFloat(finalitem[1].replace('%', '')) + 10) + '%';
                            finalitem[2] = math.evaluate(parseFloat(finalitem[2].replace('%', '')) - 5) + '%';
                        }
                        if (element.goal[0] < element.goal[1]) {
                            finalitem[0] = math.evaluate(parseFloat(finalitem[0].replace('%', '')) + 10) + '%';
                            finalitem[1] = math.evaluate(parseFloat(finalitem[1].replace('%', '')) - 5) + '%';
                            finalitem[2] = math.evaluate(parseFloat(finalitem[2].replace('%', '')) - 5) + '%';
                        }
                    }
                    if (guest == element.guest) {
                        if (element.goal[0] < element.goal[1]) {
                            finalitem[0] = math.evaluate(parseFloat(finalitem[0].replace('%', '')) - 5) + '%';
                            finalitem[1] = math.evaluate(parseFloat(finalitem[1].replace('%', '')) - 5) + '%';
                            finalitem[2] = math.evaluate(parseFloat(finalitem[2].replace('%', '')) + 10) + '%';
                        }
                        if (element.goal[0] == element.goal[1]) {
                            finalitem[0] = math.evaluate(parseFloat(finalitem[0].replace('%', '')) - 5) + '%';
                            finalitem[1] = math.evaluate(parseFloat(finalitem[1].replace('%', '')) + 10) + '%';
                            finalitem[2] = math.evaluate(parseFloat(finalitem[2].replace('%', '')) - 5) + '%';
                        }
                        if (element.goal[0] > element.goal[1]) {
                            finalitem[0] = math.evaluate(parseFloat(finalitem[0].replace('%', '')) + 10) + '%';
                            finalitem[1] = math.evaluate(parseFloat(finalitem[1].replace('%', '')) - 5) + '%';
                            finalitem[2] = math.evaluate(parseFloat(finalitem[2].replace('%', '')) - 5) + '%';
                        }
                    }
                    // console.log( "+++++++++"+ finalitem);
                } else {
                    break;
                }
            }
            console.log('散户心理:'.red + finalitem);

            oneresult.set("test6", '散户心理:' + finalitem);

            element.set("sanhuxinli",finalitem);

            if (bet365item != null && bet365item != undefined) {
                console.log('投注额:' + math.format(bet365item.odds[0] * parseFloat(finalitem[0].replace('%', '')), 3) + ',' + math.format(bet365item.odds[1] * parseFloat(finalitem[1].replace('%', '')), 3) + ',' + math.format(bet365item.odds[2] * parseFloat(finalitem[2].replace('%', '')), 3));
                console.log('赔率:' + bet365item.odds[0] + "," + bet365item.odds[1] + "," + bet365item.odds[2]);
               
                oneresult.set("test7", '投注额:' + math.format(bet365item.odds[0] * parseFloat(finalitem[0].replace('%', '')), 3) + ',' + math.format(bet365item.odds[1] * parseFloat(finalitem[1].replace('%', '')), 3) + ',' + math.format(bet365item.odds[2] * parseFloat(finalitem[2].replace('%', '')), 3));
                oneresult.set("test8", '赔率:' + bet365item.odds[0] + "," + bet365item.odds[1] + "," + bet365item.odds[2]);
            }


            // 进行第7轮的50%的浮动，主要是针对让球进行处理。让球为55开的几率，赢或者不赢，也有可能是走盘，走盘还是要看大小球
            const PankouMoney = Parse.Object.extend("PankouMoney");

            const pankoumoney = new Parse.Query(PankouMoney);

            pankoumoney.equalTo("matchId", matchId);

            pankoumoney.limit(1);

            const pankoumoneyitem = await pankoumoney.first();
            let yapanitem = ['0%', '0%'];
            let qiuitem = ['0%', '0%'];
            let homeqiushu = 0;   //主队进球数
            let guestqiushu = 0;  //客队进球数
            let homezuijinqiushu = 0;  //主队最近进球数
            let guestzuijinqiushu = 0; //客队最近进球数

            if (pankoumoneyitem != undefined && pankoumoneyitem != null) {
                const bet365pankou = pankoumoneyitem.get('bet365pankou');
                const bet10pankou = pankoumoneyitem.get('bet10pankou');
                const bet365qiu = pankoumoneyitem.get('bet365qiu');
                const bet10qiu = pankoumoneyitem.get('bet10qiu');

                //两队历史来增加亚盘的让球性,二场比赛的球数，
                //主队的总进球+客队的总进球。主队的丢球+客队的丢球。 
                //两队历史球数对拼

                for (let index = 0; index < historylist.length; index++) {
                    const element = historylist[index];
                    if (index < 2) {
                        if (home == element.home && guest == element.guest) {
                            homeqiushu += element.goal[0];
                            guestqiushu += element.goal[1];
                        }
                        if (home == element.guest && guest == element.home) {
                            homeqiushu += element.goal[1];
                            guestqiushu += element.goal[0];
                        }
                    } else {
                        break;
                    }

                }




                //降盘是为了能 更容易的买大球，升盘，为了更容易的买小球

                //主队最近进球数。
                //主队最近丢球，客队最近丢球。
                let homediuqiu = 0;
                let guestdiuqiu = 0;

                for (let index = 0; index < homelist.length; index++) {
                    const element = homelist[index];
                    if (index < 2) {
                        if (home == element.home) {
                            homezuijinqiushu += element.goal[0];
                            homediuqiu += element.goal[1];
                        }
                        if (home == element.guest) {
                            homezuijinqiushu += element.goal[1];
                            homediuqiu += element.goal[0];
                        }
                    } else {
                        break;
                    };
                }

                //客队最近进球数。
                for (let index = 0; index < guestlist.length; index++) {
                    const element = guestlist[index];
                    if (index < 2) {
                        if (guest == element.home) {
                            guestzuijinqiushu += element.goal[0];
                            guestdiuqiu += element.goal[1];
                        }
                        if (guest == element.guest) {
                            guestzuijinqiushu += element.goal[1];
                            guestdiuqiu += element.goal[0];
                        }
                    } else {
                        break;
                    };
                }

                //亚盘
                if (bet365pankou != undefined && bet10pankou != undefined && bet365qiu != undefined && bet10qiu != undefined) {

                    //firstOdds,odds,firstPankou,pankou,firstReturnRatio,returnRatio //大小球一样
                    const pankou1 = parseFloat(changepankou(bet10pankou.firstPankou));
                    const pankou2 = parseFloat(changepankou(bet10pankou.pankou));


                    let bet10firstratio = math.format(bet10pankou.firstReturnRatio.replace('%', '') / 100, 3);

                    let bet10firstodds0 = parseFloat(bet10pankou.firstOdds[0]) + 1;
                    let bet10firstodds1 = parseFloat(bet10pankou.firstOdds[1]) + 1;

                    firstyapanitem = [
                        math.format(bet10firstratio / bet10firstodds0, 2) * 100,
                        math.format(bet10firstratio / bet10firstodds1, 2) * 100
                    ]

                    // let bet365ratio = math.format(bet365pankou.returnRatio.replace('%', '') / 100, 3);

                    let bet10ratio = math.format(bet10pankou.returnRatio.replace('%', '') / 100, 3);

                    let bet365odds0 = parseFloat(bet365pankou.odds[0]) + 1;
                    let bet365odds1 = parseFloat(bet365pankou.odds[1]) + 1;

                    let bet10odds0 = parseFloat(bet10pankou.odds[0]) + 1;
                    let bet10odds1 = parseFloat(bet10pankou.odds[1]) + 1;

                    yapanitem = [
                        math.format(bet10ratio / bet10odds0, 2) * 100,
                        math.format(bet10ratio / bet10odds1, 2) * 100
                    ]

                    //降返回率 是不打算赔付高概率的一面
                    console.log("亚盘初始概率:" + math.format(firstyapanitem[0],2) + "%-" + firstyapanitem[1] + "%" + " <=> 盘口:" + pankou1 + "," + pankou2 +" 返回率:" +bet10firstratio+ " => ".green+ bet10ratio);
                    
                    oneresult.set("test9" , "亚盘初始概率:" + firstyapanitem[0] + "%-" + firstyapanitem[1] + "%" + " <=> 盘口:" + pankou1 + "," + pankou2+" 返回率:" +bet10firstratio+ " => "+ bet10ratio);

                    let x0 = math.abs(math.format(bet365odds0 - bet10odds0, 2));
                    let x1 = math.abs(math.format(bet365odds1 - bet10odds1, 2));



                    if (parseFloat(x0) > parseFloat(x1)) {
                        //说明看好 右边
                        yapanitem = [
                            yapanitem[0] - 5,
                            yapanitem[1] + 5
                        ];
                    }

                    if (parseFloat(x0) < parseFloat(x1)) {
                        //说明看好 左边
                        yapanitem = [
                            yapanitem[0] + 5,
                            yapanitem[1] - 5
                        ];
                    }
                    if (parseFloat(x0) == parseFloat(x1)) {
                        if (bet365odds0 <= bet365odds1) {
                            yapanitem = [
                                yapanitem[0] + 5,
                                yapanitem[1] - 5
                            ];
                        } else {
                            yapanitem = [
                                yapanitem[0] - 5,
                                yapanitem[1] + 5
                            ];
                        }
                    }

                    //第七轮，第一次不变盘处理数据
                    if (pankou1 == pankou2) {

                        if (bet365odds0 <= bet365odds1) {
                            yapanitem = [
                                yapanitem[0] + 5,
                                yapanitem[1] - 5
                            ];
                        } else {
                            yapanitem = [
                                yapanitem[0] - 5,
                                yapanitem[1] + 5
                            ];
                        }
                    }
                    //降盘
                    if (pankou1 > pankou2) {

                        yapanitem = [yapanitem[0] - 5, yapanitem[1] + 5];
                        let chaibie = pankou1 - pankou2;
                        let temp = math.abs(chaibie) / 0.25;
                        yapanitem = [yapanitem[0] - temp, yapanitem[1] + temp];
                    }
                    //升盘
                    if (pankou1 < pankou2) {
                        yapanitem = [yapanitem[0] + 5, yapanitem[1] - 5];
                        let chaibie = pankou1 - pankou2;
                        let temp = math.abs(chaibie) / 0.25;
                        yapanitem = [yapanitem[0] + temp, yapanitem[1] - temp];
                    }



                    console.log("亚盘变动后的概率:".white + yapanitem[0] + "%-" + yapanitem[1] + "%" + " <=> 盘口:".red + pankou1 + "," + pankou2);
                    
                    element.set('yapanpankou1',pankou1);
                    element.set('yapanpankou2',pankou2);


                    oneresult.set("test10" , "亚盘变动后的概率:" + yapanitem[0] + "%-" + yapanitem[1] + "%" + " <=> 盘口:" + pankou1 + "," + pankou2);

                    //在这里转换欧盘概率。
                    let temparray = [0, 0];
                    if (pankou2 > 0) {
                        temparray[0] = parseInt(ouzhuanya[0].replace('%', ''));
                        temparray[1] = parseInt(ouzhuanya[1].replace('%', '')) + parseInt(ouzhuanya[2].replace('%', ''));

                        let temp = (pankou2 / 0.25) * 5;


                        //计算大于0，增加概率

                        console.log("欧盘转亚盘后的概率:".green + (temparray[0] + temp) + "%," + (temparray[1] - temp) + "%");

                        oneresult.set("test11" , "欧盘转亚盘后的概率:" + (temparray[0] + temp) + "%," + (temparray[1] - temp) + "%");
                    }

                    if (pankou2 == 0) {
                        temparray[0] = parseInt(ouzhuanya[0].replace('%', '')) + parseInt(ouzhuanya[1].replace('%', ''));
                        temparray[1] = parseInt(ouzhuanya[2].replace('%', ''));


                        console.log("欧盘转亚盘后的概率:".green + temparray[0] + "%," + temparray[1] + "%");

                        oneresult.set("test12" , "欧盘转亚盘后的概率:" + temparray[0] + "%," + temparray[1] + "%");
                    }

                    if (pankou2 < 0) {
                        temparray[0] = parseInt(ouzhuanya[0].replace('%', '')) + parseInt(ouzhuanya[1].replace('%', ''));
                        temparray[1] = parseInt(ouzhuanya[2].replace('%', ''));

                        let temp = (math.abs(pankou2) / 0.25) * 5;


                        //计算大于0，增加概率

                        console.log("欧盘转亚盘后的概率:".green + (temparray[0] - temp) + "%," + (temparray[1] + temp) + "%");

                        oneresult.set("test13" , "欧盘转亚盘后的概率:" + (temparray[0] - temp) + "%," + (temparray[1] + temp) + "%");
                    }
                }

                //亚盘投注情况

                if (bet365pankou != undefined && bet10pankou != undefined && bet365qiu != undefined && bet10qiu != undefined) {
                    //散户投注数据。

                    let bet365ratio = math.format(bet365pankou.firstReturnRatio.replace('%', '') / 100, 3);

                    let bet365odds0 = parseFloat(bet365pankou.firstOdds[0]) + 1;
                    let bet365odds1 = parseFloat(bet365pankou.firstOdds[1]) + 1;

                    let changguiqiushu = (homezuijinqiushu + homeqiushu - guestzuijinqiushu - guestqiushu) / 4
                    let qiushupankou = parseFloat(changepankou(bet365pankou.firstPankou));
                    //开盘盘口 - 常规盘口，负数看大，正数看小，相等55开。
                    let chaibie = changguiqiushu - qiushupankou;

                    let chaibieitem = [
                        math.format(bet365ratio / bet365odds0, 2) * 100,
                        math.format(bet365ratio / bet365odds1, 2) * 100
                    ]

                    if (chaibie > 0) {
                        let temp = math.abs(chaibie) / 0.25;
                        chaibieitem = [chaibieitem[0] + temp, chaibieitem[1] - temp];
                    }
                    else if (chaibie < 0) {
                        let temp = math.abs(chaibie) / 0.25;
                        chaibieitem = [chaibieitem[0] - temp, chaibieitem[1] + temp];
                    }

                    let chaibie2 = (homeqiushu - guestqiushu) - qiushupankou;

                    if (chaibie2 > 0) {
                        let temp = math.abs(chaibie2) / 0.25;
                        chaibieitem = [chaibieitem[0] + temp, chaibieitem[1] - temp];
                    }
                    else if (chaibie2 < 0) {
                        let temp = math.abs(chaibie2) / 0.25;
                        chaibieitem = [chaibieitem[0] - temp, chaibieitem[1] + temp];
                    }
                    let chaibie3 = (homezuijinqiushu - guestzuijinqiushu) - qiushupankou;

                    if (chaibie3 > 0) {
                        let temp = math.abs(chaibie3) / 0.25;
                        chaibieitem = [chaibieitem[0] + temp, chaibieitem[1] - temp];
                    }
                    else if (chaibie3 < 0) {
                        let temp = math.abs(chaibie3) / 0.25;
                        chaibieitem = [chaibieitem[0] - temp, chaibieitem[1] + temp];
                    }

                    console.log("亚盘投注情况-----:" + chaibieitem[0] + "%," + chaibieitem[1] + "%");

                    oneresult.set("test14" ,"亚盘投注情况-----:" + chaibieitem[0] + "%," + chaibieitem[1] + "%");
                }



                //球数
                if (bet365pankou != undefined && bet10pankou != undefined && bet365qiu != undefined && bet10qiu != undefined) {

                    //firstOdds,odds,firstPankou,pankou,firstReturnRatio,returnRatio //大小球一样
                    const pankou1 = parseFloat(changeqiu(bet10qiu.firstPankou));
                    const pankou2 = parseFloat(changeqiu(bet10qiu.pankou));

                    let bet10firstratio = math.format(bet10qiu.firstReturnRatio.replace('%', '') / 100, 3);

                    let bet10firstodds0 = parseFloat(bet10qiu.firstOdds[0]) + 1;
                    let bet10firstodds1 = parseFloat(bet10qiu.firstOdds[1]) + 1;

                    // let bet365ratio = math.format(bet365qiu.returnRatio.replace('%', '') / 100, 3);

                    let bet10ratio = math.format(bet10qiu.returnRatio.replace('%', '') / 100, 3);

                    let bet365odds0 = parseFloat(bet365qiu.odds[0]) + 1;
                    let bet365odds1 = parseFloat(bet365qiu.odds[1]) + 1;

                    let bet10odds0 = parseFloat(bet10qiu.odds[0]) + 1;
                    let bet10odds1 = parseFloat(bet10qiu.odds[1]) + 1;


                    qiuitem = [
                        math.format(bet10ratio / bet10odds0, 2) * 100,
                        math.format(bet10ratio / bet10odds1, 2) * 100
                    ]

                    firstqiuitem = [
                        math.format(bet10firstratio / bet10firstodds0, 2) * 100,
                        math.format(bet10firstratio / bet10firstodds1, 2) * 100
                    ]

                    console.log("球数初始概率:" + math.format(firstqiuitem[0],2) + "%-" + firstqiuitem[1] + "%" + " <=> 盘口:" + pankou1 + "," + pankou2+" 返回率:" +bet10firstratio+ " => ".green + bet10ratio);

                    
                    oneresult.set("test15" ,"球数初始概率:" + firstqiuitem[0] + "%-" + firstqiuitem[1] + "%" + " <=> 盘口:" + pankou1 + "," + pankou2+" 返回率:" +bet10firstratio+ " => "+ bet10ratio);

                    let x0 = math.abs(math.format(bet365odds0 - bet10odds0, 2));
                    let x1 = math.abs(math.format(bet365odds1 - bet10odds1, 2));



                    if (parseFloat(x0) > parseFloat(x1)) {
                        //说明看好 右边
                        qiuitem = [
                            qiuitem[0] - 5,
                            qiuitem[1] + 5
                        ];
                    }

                    if (parseFloat(x0) < parseFloat(x1)) {
                        //说明看好 左边
                        qiuitem = [
                            qiuitem[0] + 5,
                            qiuitem[1] - 5
                        ];
                    }
                    if (parseFloat(x0) == parseFloat(x1)) {
                        if (bet365odds0 <= bet365odds1) {
                            qiuitem = [
                                qiuitem[0] + 5,
                                qiuitem[1] - 5
                            ];
                        } else {
                            qiuitem = [
                                qiuitem[0] - 5,
                                qiuitem[1] + 5
                            ];
                        }
                    }

                    //第七轮，第一次不变盘处理数据
                    if (pankou1 == pankou2) {

                        if (bet365odds0 <= bet365odds1) {
                            qiuitem = [
                                qiuitem[0] + 5,
                                qiuitem[1] - 5
                            ];
                        } else {
                            qiuitem = [
                                qiuitem[0] - 5,
                                qiuitem[1] + 5
                            ];
                        }
                    }
                    //降盘
                    if (pankou1 > pankou2) {
                        qiuitem = [qiuitem[0] - 5, qiuitem[1] + 5];
                        let chaibie = pankou1 - pankou2;
                        let temp = math.abs(chaibie) / 0.25;
                        qiuitem = [qiuitem[0] - temp, qiuitem[1] + temp];

                    }
                    //升盘
                    if (pankou1 < pankou2) {
                        qiuitem = [qiuitem[0] + 5, qiuitem[1] - 5];
                        let chaibie = pankou1 - pankou2;
                        let temp = math.abs(chaibie) / 0.25;
                        qiuitem = [qiuitem[0] + temp, qiuitem[1] - temp];
                    }

                    console.log("球数变动后的概率:".white + qiuitem[0] + "%-" + qiuitem[1] + "%" + " <=> 盘口:".red + pankou1 + "," + pankou2);

                    element.set('qiushupankou1',pankou1);
                    element.set('qiushupankou2',pankou2);

                    oneresult.set("test16" ,"球数变动后的概率:" + qiuitem[0] + "%-" + qiuitem[1] + "%" + " <=> 盘口:" + pankou1 + "," + pankou2);

                }


                if (bet365pankou != undefined && bet10pankou != undefined && bet365qiu != undefined && bet10qiu != undefined) {
                    //散户投注数据。

                    let bet365ratio = math.format(bet365qiu.firstReturnRatio.replace('%', '') / 100, 3);

                    let bet365odds0 = parseFloat(bet365qiu.firstOdds[0]) + 1;
                    let bet365odds1 = parseFloat(bet365qiu.firstOdds[1]) + 1;

                    let changguiqiushu = (homezuijinqiushu + homeqiushu + guestzuijinqiushu + guestqiushu) / 4
                    let qiushupankou = parseFloat(changeqiu(bet10qiu.firstPankou));
                    //开盘盘口 - 常规盘口，负数看大，正数看小，相等55开。
                    let chaibie = qiushupankou - changguiqiushu;
                    let chaibieitem = [
                        math.format(bet365ratio / bet365odds0, 2) * 100,
                        math.format(bet365ratio / bet365odds1, 2) * 100
                    ]

                    if (chaibie > 0) {
                        let temp = math.abs(chaibie) / 0.25;
                        chaibieitem = [chaibieitem[0] - temp, chaibieitem[1] + temp];
                    }
                    else if (chaibie < 0) {
                        let temp = math.abs(chaibie) / 0.25;
                        chaibieitem = [chaibieitem[0] + temp, chaibieitem[1] - temp];
                    }

                    let chaibie2 = qiushupankou - (homeqiushu + guestqiushu) / 2;

                    if (chaibie2 > 0) {
                        let temp = math.abs(chaibie2) / 0.25;
                        chaibieitem = [chaibieitem[0] - temp, chaibieitem[1] + temp];
                    }
                    else if (chaibie2 < 0) {
                        let temp = math.abs(chaibie2) / 0.25;
                        chaibieitem = [chaibieitem[0] + temp, chaibieitem[1] - temp];
                    }
                    let chaibie3 = qiushupankou - (homezuijinqiushu + guestzuijinqiushu) / 2;

                    if (chaibie3 > 0) {
                        let temp = math.abs(chaibie3) / 0.25;
                        chaibieitem = [chaibieitem[0] - temp, chaibieitem[1] + temp];
                    }
                    else if (chaibie3 < 0) {
                        let temp = math.abs(chaibie3) / 0.25;
                        chaibieitem = [chaibieitem[0] + temp, chaibieitem[1] - temp];
                    }

                    console.log("散户球数投注情况:" + "-------".yellow + chaibieitem[0] + "%," + chaibieitem[1] + "%");

                    oneresult.set("test17" ,"散户球数投注情况:" + "-------" + chaibieitem[0] + "%," + chaibieitem[1] + "%");

                }

                if (bet365pankou != undefined && bet10pankou != undefined && bet365qiu != undefined && bet10qiu != undefined) {
                    //散户投注数据。
                    let changguiqiushu = (homezuijinqiushu + homeqiushu + guestzuijinqiushu + guestqiushu) / 4
                    let qiushupankou = parseFloat(changeqiu(bet365qiu.firstPankou));
                    //开盘盘口 - 常规盘口，负数看大，正数看小，相等55开。
                    let chaibie = qiushupankou - changguiqiushu;

                    let bet365ratio = math.format(bet365qiu.firstReturnRatio.replace('%', '') / 100, 3);

                    let bet365odds0 = parseFloat(bet365qiu.firstOdds[0]) + 1;
                    let bet365odds1 = parseFloat(bet365qiu.firstOdds[1]) + 1;

                    let chaibieitem = [
                        math.format(bet365ratio / bet365odds0, 2) * 100,
                        math.format(bet365ratio / bet365odds1, 2) * 100
                    ]

                    if (chaibie > 0) {
                        let temp = math.abs(chaibie) / 0.25;
                        chaibieitem = [chaibieitem[0] - temp, chaibieitem[1] + temp];
                    }
                    else if (chaibie < 0) {
                        let temp = math.abs(chaibie) / 0.25;
                        chaibieitem = [chaibieitem[0] + temp, chaibieitem[1] - temp];
                    }

                    let chaibie2 = qiushupankou - (homeqiushu + homezuijinqiushu) / 2;

                    if (chaibie2 > 0) {
                        let temp = math.abs(chaibie2) / 0.25;
                        chaibieitem = [chaibieitem[0] - temp, chaibieitem[1] + temp];
                    }
                    else if (chaibie2 < 0) {
                        let temp = math.abs(chaibie2) / 0.25;
                        chaibieitem = [chaibieitem[0] + temp, chaibieitem[1] - temp];
                    }
                    let chaibie3 = qiushupankou - (guestzuijinqiushu + guestqiushu) / 2;

                    if (chaibie3 > 0) {
                        let temp = math.abs(chaibie3) / 0.25;
                        chaibieitem = [chaibieitem[0] - temp, chaibieitem[1] + temp];
                    }
                    else if (chaibie3 < 0) {
                        let temp = math.abs(chaibie3) / 0.25;
                        chaibieitem = [chaibieitem[0] + temp, chaibieitem[1] - temp];
                    }

                    // console.log("另一种散户球数投注情况:" + "-------".yellow + chaibieitem[0] + "%," + chaibieitem[1] + "%");

                    // oneresult.set("test18" ,"另一种散户球数投注情况:" + "-------" + chaibieitem[0] + "%," + chaibieitem[1] + "%");
                }

                console.log("两队历史记录球数：".red + homeqiushu + '  ,  ' + guestqiushu + " 约 :  ".green + (homeqiushu + guestqiushu) / 2);
                console.log("两队最近战绩球数：".red + homezuijinqiushu + '（' + homediuqiu + '）' + '  ,  ' + guestzuijinqiushu + '（' + guestdiuqiu + '）' + " 约 :  " + (homezuijinqiushu + guestzuijinqiushu) / 2);
                // console.log("两队历史亚盘球数：".white + (homeqiushu + guestqiushu) / 2);
                // console.log("两队最近亚盘球数：".white + (homezuijinqiushu + guestzuijinqiushu) / 2);
                oneresult.set("test19" ,"两队历史记录球数：" + homeqiushu + '  ,  ' + guestqiushu + " 约 :  " + (homeqiushu + guestqiushu) / 2);
                oneresult.set("test20" ,"两队最近战绩球数：" + homezuijinqiushu + '（' + homediuqiu + '）' + '  ,  ' + guestzuijinqiushu + '（' + guestdiuqiu + '）' + " 约 :  " + (homezuijinqiushu + guestzuijinqiushu) / 2);

                console.log("两队常规球数：".yellow + (homezuijinqiushu + homeqiushu + guestzuijinqiushu + guestqiushu) / 4);
                console.log("两队常规让球：".yellow + (homezuijinqiushu + homeqiushu - guestzuijinqiushu - guestqiushu) / 4);

                element.set("changguiqiushu",(homezuijinqiushu + homeqiushu + guestzuijinqiushu + guestqiushu) / 4);
                element.set("changguiyapan",(homezuijinqiushu + homeqiushu - guestzuijinqiushu - guestqiushu) / 4);
                
                // console.log("两队历史亚盘让球：".white + (homeqiushu - guestqiushu) / 2);
                oneresult.set("test21" ,"两队常规球数：" + (homezuijinqiushu + homeqiushu + guestzuijinqiushu + guestqiushu) / 4);
                oneresult.set("test22" ,"两队常规让球：" + (homezuijinqiushu + homeqiushu - guestzuijinqiushu - guestqiushu) / 4);

            }

            if (parseFloat(justitem[1].replace('%', '')) >= 30 && parseFloat(justitem[1].replace('%', '')) <= 40) {
                console.log('结果：平\n');
            }
            else if (parseFloat(justitem[0].replace('%', '')) <= parseFloat(-15) || parseFloat(justitem[1].replace('%', '')) <= parseFloat(-15) || parseFloat(justitem[2].replace('%', '')) <= parseFloat(-15)) {
                if (parseFloat(justitem[0].replace('%', '')) <= -15)
                    console.log("结果：胜\n");
                if (parseFloat(justitem[1].replace('%', '')) <= -15)
                    console.log("结果：平\n");
                if (parseFloat(justitem[2].replace('%', '')) <= -15)
                    console.log("结果：负\n");
            }
            else {
                if (parseFloat(justitem[0].replace('%', '')) >= parseFloat(justitem[2].replace('%', ''))) {
                    console.log('结果：胜\n');
                }
                if (parseFloat(justitem[0].replace('%', '')) < parseFloat(justitem[2].replace('%', ''))) {
                    console.log('结果：负\n');
                }
            }
            
            element.save();
            oneresult.save();
        }

    });

//转换
function changepankou(temp) {
    if (temp == '平手') {
        return 0;
    } else if (temp == '平手/半球') {
        return 0.25;
    } else if (temp == '半球') {
        return 0.5;
    } else if (temp == '半球/一球') {
        return 0.75;
    } else if (temp == '一球') {
        return 1;
    } else if (temp == '一球/一球半') {
        return 1.25;
    } else if (temp == '一球半') {
        return 1.5;
    } else if (temp == '一球半/二球') {
        return 1.75;
    } else if (temp == '二球') {
        return 2;
    } else if (temp == '二球/二球半') {
        return 2.25;
    } else if (temp == '二球半') {
        return 2.5;
    } else if (temp == '受平手') {
        return 0;
    } else if (temp == '受平手/半球') {
        return -0.25;
    } else if (temp == '受半球') {
        return -0.5;
    } else if (temp == '受半球/一球') {
        return -0.75;
    } else if (temp == '受一球') {
        return -1;
    } else if (temp == '受一球/一球半') {
        return -1.25;
    } else if (temp == '受一球半') {
        return -1.5;
    } else if (temp == '受一球半/二球') {
        return -1.75;
    } else if (temp == '受二球') {
        return -2;
    } else {
        console.log("没有匹配到亚盘盘口".red);
    }
}

function changeqiu(temp) {
    if (temp == '一球') {
        return 1;
    } else if (temp == '一球半') {
        return 1.5;
    } else if (temp == '一球半/二球') {
        return 1.75;
    } else if (temp == '二球') {
        return 2;
    } else if (temp == '二球/二球半') {
        return 2.25;
    } else if (temp == '二球半') {
        return 2.5;
    } else if (temp == '二球半/三球') {
        return 2.75;
    } else if (temp == '三球') {
        return 3;
    } else if (temp == '三球/三球半') {
        return 3.25;
    }
    else if (temp == '三球半') {
        return 3.5;
    } else if (temp == '三球半/四球') {
        return 3.75;
    } else if (temp == '四球') {
        return 4;
    } else if (temp == '四球/四球半') {
        return 4.25;
    } else if (temp == '四球半') {
        return 4.5;
    } else if (temp == '四球半/五球') {
        return 4.75;
    } else if (temp == '五球') {
        return 5;
    } else {
        console.log("没有匹配到大小球".red);
    }
}