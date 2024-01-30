import { Proof, PublicSignals, VerficationKey } from "@/types/zk";
import { Data, PlutusScript } from "@meshsdk/core";
import vkJson from "./vk.json";
import * as CSL from "@emurgo/cardano-serialization-lib-nodejs";
const snarkjs = require("snarkjs");
const circomlibjs = require("circomlibjs");
import * as bigintBuffer from "bigint-buffer";

export interface ColorSchema {
  color: string;
  colorDark: string;
  bgTW: string;
  bgTWDark: string;
}

export const colorSchema: ColorSchema[] = [
  {
    color: "#FFB400",
    colorDark: "#FFB400",
    bgTW: "bg-[#FFB400]",
    bgTWDark: "bg-[#FFB400]",
  },
  {
    color: "#FF5A5F",
    colorDark: "#FF5A5F",
    bgTW: "bg-[#FF5A5F]",
    bgTWDark: "bg-[#FF5A5F]",
  },
  {
    color: "#8CE071",
    colorDark: "#8CE071",
    bgTW: "bg-[#8CE071]",
    bgTWDark: "bg-[#8CE071]",
  },
  {
    color: "#00D1C1",
    colorDark: "#00D1C1",
    bgTW: "bg-[#00D1C1]",
    bgTWDark: "bg-[#00D1C1]",
  },
  {
    color: "#007A87",
    colorDark: "#007A87",
    bgTW: "bg-[#007A87]",
    bgTWDark: "bg-[#007A87]",
  },
  {
    color: "#7B0051",
    colorDark: "#7B0051",
    bgTW: "bg-[#7B0051]",
    bgTWDark: "bg-[#7B0051]",
  },
];

export const plutusScript: PlutusScript = {
  version: "V2",
  code: "5913b05913ad0100003232332232323322323232323232323322323232323232323232323232323232323232323232323232323232323232332232323223232323232323232323232323232323232232232325335323232323232533335005153355335333573466e1ccdc01a80311111111111111111005a40046aa002444444444444444440160840822084266ae712401105475726e6f20696e636f72726563746f00041153355335333573466e1ccdc31a80311111111111111111005a400890010210208821099ab9c491114d6f64756c6f20696e636f72726563746f0004115335333573466e20d40188888888888888888802d20140420411042133573892010f7061727469646120616361626164610004110411041153355335333573466e1cd4018888888888888888880352008042041133024500335006222222222222222220101041104215335333573466e20d401888888888888888888035200804204115335333573466e1cd40188888888888888888802d20140420411330245003350062222222222222222201110411041153355335333573466e1ccdc01a80311111111111111111005a40046aa002444444444444444440160840822084266ae71241105475726e6f20696e636f72726563746f0004115335333573466e1ccdc31a80311111111111111111005a400890000210208999ab9a337106a00c44444444444444444016900a021020882088208a99aa99a999ab9a3370e6a00c4444444444444444401690000210208821099ab9c4910c63757272656e74207475726e00041153355335323233355302b120013503150302350012233355302e120013503450332350012233350012330364800000488cc0dc0080048cc0d800520000013302100200132323330210350020015004500333355302612001301e032504f33553023120012350012222003302500410421335738921134e6f742076616c756520636f6e73657276656400041153355335333573466e1cc8cccd54c0a848004c8cd40c888ccd40bc00c004008d40b0004cd40c4888c00cc008004800488cdc0000a400400290001a80311111111111111111007240100840822084266ae71241104c656e67746820696e636f727265637400041153355335333573466e1cd540048888888888888888802d20020420411042133573892113496e636f7272656374206e657720646174756d0004115335330245003355001222222222222222220101042133573892010d5478206e6f74207369676e65640004110411041104110411533353553353024003130434988854cd40044008884c11d2622220021326320453357389210f646174756d206e6f7420666f756e640004f2323232323232323232323232323232323232153353333333574802646666ae68cdc39aab9d5013480008cccd55cfa8099282f91999aab9f501325060233335573ea0264a0c246666aae7d404c941888cccd55cfa8099283191999aab9f501325064233335573ea0264a0ca46666aae7d404c941988cccd55cfa8099283391999aab9f501325068233335573ea0264a0d246666aae7d404c941a88cccd55cfa8099283591999aab9f50132506c233335573ea0264a0da46666aae7d404c941b88cccd55cfa8099283791999aab9f35744a0284a66a60b26ae854094854cd4c168d5d0a81290a99a98389aba1502521533533507107235742a04a42a66a60e66ae854094854cd4c1d0d5d0a81290a99a983a9aba15025215335307635742a04a42a66a66a0ec0ee6ae854094854cd4cd41dd41d8d5d0a81290a99a99a83c283b9aba15025215335335079507835742a04a42a66a66a0f46a0f4a0f26ae854094854cd4cd41ed41e8d5d0a81290a99a99a83e03e9aba1502521533533507d507c35742a04a42a66a66a0fc0fe6ae85409484d420804ccccccccccccccccc1a004404003c03803403002c02802402001c01801401000c0080045420004541fc541f8541f4541f0541ec541e8541e4541e0541dc541d8541d4541d0541cc541c8541c4541c0941c01d41d01cc1c81c41c01bc1b81b41b01ac1a81a41a019c1981941909417816094174941749417494174188840044c98c8160cd5ce24910646174756d2077726f6e67207479706500062135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aba25001135573ca00226ea800484c98c8118cd5ce2490f646174756d206e6f7420666f756e64000501533530260022135001223500122220031326320443357389210c5478206e6f7420666f756e640004e135001220023333573466e1cd55cea80224000466442466002006004646464646464646464646464646666ae68cdc39aab9d500c480008cccccccccccc88888888888848cccccccccccc00403403002c02802402001c01801401000c008cd41600fcd5d0a80619a82c01f9aba1500b33505804035742a014666aa084eb94104d5d0a804999aa8213ae504135742a01066a0b008e6ae85401cccd54108121d69aba150063232323333573466e1cd55cea801240004664424660020060046464646666ae68cdc39aab9d5002480008cc8848cc00400c008cd4149d69aba150023053357426ae8940088c98c8164cd5ce02b03182b89aab9e5001137540026ae854008c8c8c8cccd5cd19b8735573aa004900011991091980080180119a8293ad35742a00460a66ae84d5d1280111931902c99ab9c056063057135573ca00226ea8004d5d09aba250022326320553357380a40be0a626aae7940044dd50009aba1500533505875c6ae854010ccd541081108004d5d0a801999aa8213ae200135742a004608c6ae84d5d1280111931902899ab9c04e05b04f135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d55cf280089baa00135742a008606c6ae84d5d1280211931902199ab9c04004d0413333573466e1d4015200621222200223333573466e1d4019200421222200323333573466e1d401d200221222200423333573466e1d4021200021222200123263204533573808409e0860840820806666ae68cdc39aab9d5016480008ccccccccccccccccc0b0dd71aba15016375c6ae854054dd69aba1501433504875a6ae85404cdd69aba15012375a6ae854044dd69aba15010375a6ae85403ccd4121d69aba1500e335048504735742a01a66a090a08e6ae854030cd4121411cd5d0a80599a8241a82428239aba1500a335048504735742a01266a090eb4d5d0a80419a82428239aba1500733504875a6ae84d5d1280391931902099ab9c03e04b03f104a1326320403357389201035054350004a135573ca00226ea80044d55ce9baa001135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aab9e50011375400244466aa60102400246a0024466aa05c00466aa60162400246a0024466aa062004666a00246601490000009119805801000919805000a4000002660080040024466aa600c2400246a0024466aa058004666a002466aa60142400246a0024466aa0600046aa01800200244666aaa01001e004002466aa60142400246a0024466aa0600046aa016002002666aaa006014004002222444666aa601224002a06266aa600c2400246a0024466aa0580046aa010002666aa601224002446a00444a66a666aa6020240026466a03044666a006440040040026a00244002246600244a66a0042058200205246a002446601400400a00c2006266a06a008006a06400266aa600c2400246a002446466aa05a006600200a640026aa06e44a66a00226aa0120064426a00444a66a6601800401022444660040140082600c0060042242444600600822424446002008640026aa05c442244a66a0022a06044266a062600800466aa600c24002008002446a004444444444444a66a666aa602624002a02c4a66a666ae68cdc780700081681609a81b0008a81a8021081688159299a9802000909a800911a80091111a804111a801111111111111199aa980b89000911a8011111299a9a80c111a803111919a802919a8021299a999ab9a3371e00400208007e2a006207e407e466a008407e4a66a666ae68cdc780100082001f8a801881f8a99a80190a99a8011099a801119a801119a801119a8011198140010009021119a801102111981400100091102111119a8021021111299a999ab9a3370e00c00608a0882a66a666ae68cdc380280102282209981800200088220822081e8a99a8009081e881e899a8228030028802a82000509931901119ab9c4901024c660002c3200135502b221122253350011002221330050023335530071200100500400122333573466e3c0080040740708d400488d4008888888888888cccd4034940c8940c8940c88ccd54c0444800540508d4004894cd54cd4ccd5cd19b8f3500222002350042200202d02c1333573466e1cd400888004d4010880040b40b040b04d40d800c540d4034c8004d540a088448894cd40044d401800c884ccd4024014c010008ccd54c01c4800401401000448d40048800448d4004880084cd4010894cd40088400c4005407888ccd5cd19b87002001017016112330012253350021001101601512335002223335003220020020013500122001122123300100300222222222222222222123333333333333333300101201101000f00e00d00c00b00a009008007006005004003002223370000400246666666ae90004940649406494064940648d4068dd700100f119191999ab9a3370e6aae7540092000233221233001003002300a35742a004600a6ae84d5d1280111931900b19ab9c013020014135573ca00226ea80048c8c8c8c8cccd5cd19b8735573aa00890001199991110919998008028020018011919191999ab9a3370e6aae7540092000233221233001003002301335742a00466a01a0246ae84d5d1280111931900d99ab9c018025019135573ca00226ea8004d5d0a802199aa8043ae500735742a0066464646666ae68cdc3a800a4008464244460040086ae84d55cf280191999ab9a3370ea0049001119091118008021bae357426aae7940108cccd5cd19b875003480008488800c8c98c8074cd5ce00d01380d80d00c89aab9d5001137540026ae854008cd4025d71aba135744a004464c6402e66ae700500840544d5d1280089aba25001135573ca00226ea80044cd54005d73ad112232230023756002640026aa03844646666aae7c008940788cd4074cd54054c018d55cea80118029aab9e500230043574400603c26ae84004488c8c8cccd5cd19b875001480008d4060c014d5d09aab9e500323333573466e1d400920022501823263201433573802203c02402226aae7540044dd5000919191999ab9a3370ea002900311909111180200298039aba135573ca00646666ae68cdc3a8012400846424444600400a60126ae84d55cf280211999ab9a3370ea006900111909111180080298039aba135573ca00a46666ae68cdc3a8022400046424444600600a6eb8d5d09aab9e500623263201433573802203c02402202001e26aae7540044dd5000919191999ab9a3370e6aae7540092000233221233001003002300535742a0046eb4d5d09aba2500223263201033573801a03401c26aae7940044dd50009191999ab9a3370e6aae75400520002375c6ae84d55cf280111931900719ab9c00b01800c13754002464646464646666ae68cdc3a800a401842444444400646666ae68cdc3a8012401442444444400846666ae68cdc3a801a40104664424444444660020120106eb8d5d0a8029bad357426ae8940148cccd5cd19b875004480188cc8848888888cc008024020dd71aba15007375c6ae84d5d1280391999ab9a3370ea00a900211991091111111980300480418061aba15009375c6ae84d5d1280491999ab9a3370ea00c900111909111111180380418069aba135573ca01646666ae68cdc3a803a400046424444444600a010601c6ae84d55cf280611931900b99ab9c01402101501401301201101000f135573aa00826aae79400c4d55cf280109aab9e5001137540024646464646666ae68cdc3a800a4004466644424466600200a0080066eb4d5d0a8021bad35742a0066eb4d5d09aba2500323333573466e1d4009200023212230020033008357426aae7940188c98c8040cd5ce00680d00700689aab9d5003135744a00226aae7940044dd5000919191999ab9a3370ea002900111909118008019bae357426aae79400c8cccd5cd19b875002480008c8488c00800cdd71aba135573ca008464c6401a66ae7002805c02c0284d55cea80089baa00112232323333573466e1d400520042122200123333573466e1d40092002232122230030043006357426aae7940108cccd5cd19b87500348000848880088c98c8038cd5ce00580c00600580509aab9d5001137540024646666ae68cdc3a800a4004400a46666ae68cdc3a80124000400a464c6401466ae7001c05002001c4d55ce9baa001122002122001490103505431002326320033357389211b65786163746c79206f6e65206f75747075742065787065637465640000d498448848cc00400c0084d400400848c88ccccccd5d20009280312803118019bac002250062500600b3200135500a2233335573e00246a00ea0164a66a60086ae84008854cd4c010d5d1001909a80499a8060010008a8038a80300591999999aba4001250032500325003235004375a0044a006010242446004006224400226a002eb448c88c008dd6000990009aa802911999aab9f00125006233500530043574200460066ae880080184488008488488cc00401000c48004448c8c00400488cc00cc008008005",
};

export class MastermindDatum {
  constructor(
    public codeMaster: string,
    public codeBreaker: string,
    public hashSol: bigint,
    public guesses: number[],
    public blackPegs: number,
    public whitePegs: number,
    public currentTurn: number,
    public nPublic: number,
    public vkAlpha1: bigint[],
    public vkBeta2: bigint[][],
    public vkGamma2: bigint[][],
    public vkDelta2: bigint[][],
    public vkAlphabeta12: bigint[][][],
    public ic: bigint[][],
    public piA: bigint[],
    public piB: bigint[][],
    public piC: bigint[]
  ) {
    const vk: VerficationKey = vkJson;
    this.nPublic = Number(vk.nPublic);
    this.vkAlpha1 = vk.vk_alpha_1.map((x) => BigInt(x));
    this.vkBeta2 = vk.vk_beta_2.map((x) => x.map((y) => BigInt(y)));
    this.vkGamma2 = vk.vk_gamma_2.map((x) => x.map((y) => BigInt(y)));
    this.vkDelta2 = vk.vk_delta_2.map((x) => x.map((y) => BigInt(y)));
    this.vkAlphabeta12 = vk.vk_alphabeta_12.map((x) =>
      x.map((y) => y.map((z) => BigInt(z)))
    );
    this.ic = vk.IC.map((x) => x.map((y) => BigInt(y)));
  }

  public setProof(proof: Proof, publicSignals: PublicSignals): void {
    this.hashSol = BigInt(publicSignals[0]);
    this.piA = proof.pi_a.map((x) => BigInt(x));
    this.piB = proof.pi_b.map((x) => x.map((y) => BigInt(y)));
    this.piC = proof.pi_c.map((x) => BigInt(x));
  }

  static fromJson(json: any): MastermindDatum {
    const result = new MastermindDatum(
      json.fields[0].bytes,
      json.fields[1].bytes,
      json.fields[2].int,
      json.fields[3].list.map((x: any) => BigInt(x.int)),
      json.fields[4].int,
      json.fields[5].int,
      json.fields[6].int,
      json.fields[7].int,
      json.fields[8].list,
      json.fields[9].list.map((x: any) =>
        x.list.map((y: any) => BigInt(y.int))
      ),
      json.fields[10].list.map((x: any) =>
        x.list.map((y: any) => BigInt(y.int))
      ),
      json.fields[11].list.map((x: any) =>
        x.list.map((y: any) => BigInt(y.int))
      ),
      json.fields[12].list.map((x: any) =>
        x.list.map((y: any) => BigInt(y.int))
      ),
      json.fields[13].list.map((x: any) =>
        x.list.map((y: any) => BigInt(y.int))
      ),
      json.fields[14].list.map((x: any) => BigInt(x.int)),
      json.fields[15].list.map((x: any) =>
        x.list.map((y: any) => BigInt(y.int))
      ),
      json.fields[16].list.map((x: any) => BigInt(x.int))
    );
    return result;
  }

  public toCSL(): CSL.PlutusData {
    const fields = CSL.PlutusList.new();

    fields.add(CSL.PlutusData.new_bytes(Buffer.from(this.codeMaster, "hex")));
    fields.add(CSL.PlutusData.new_bytes(Buffer.from(this.codeBreaker, "hex")));
    fields.add(
      CSL.PlutusData.new_integer(CSL.BigInt.from_str(this.hashSol.toString()))
    );

    const guesses = CSL.PlutusList.new();
    this.guesses.forEach((guess) => {
      guesses.add(
        CSL.PlutusData.new_integer(CSL.BigInt.from_str(guess.toString()))
      );
    });
    fields.add(CSL.PlutusData.new_list(guesses));

    fields.add(
      CSL.PlutusData.new_integer(CSL.BigInt.from_str(this.blackPegs.toString()))
    );
    fields.add(
      CSL.PlutusData.new_integer(CSL.BigInt.from_str(this.whitePegs.toString()))
    );
    fields.add(
      CSL.PlutusData.new_integer(
        CSL.BigInt.from_str(this.currentTurn.toString())
      )
    );
    fields.add(
      CSL.PlutusData.new_integer(CSL.BigInt.from_str(this.nPublic.toString()))
    );

    const vkAlpha1 = CSL.PlutusList.new();
    this.vkAlpha1.forEach((vk) => {
      vkAlpha1.add(
        CSL.PlutusData.new_integer(CSL.BigInt.from_str(vk.toString()))
      );
    });
    fields.add(CSL.PlutusData.new_list(vkAlpha1));

    const vkBeta2 = CSL.PlutusList.new();
    this.vkBeta2.forEach((vk) => {
      const vkList = CSL.PlutusList.new();
      vk.forEach((vkElem) => {
        vkList.add(
          CSL.PlutusData.new_integer(CSL.BigInt.from_str(vkElem.toString()))
        );
      });
      vkBeta2.add(CSL.PlutusData.new_list(vkList));
    });
    fields.add(CSL.PlutusData.new_list(vkBeta2));

    const vkGamma2 = CSL.PlutusList.new();
    this.vkGamma2.forEach((vk) => {
      const vkList = CSL.PlutusList.new();
      vk.forEach((vkElem) => {
        vkList.add(
          CSL.PlutusData.new_integer(CSL.BigInt.from_str(vkElem.toString()))
        );
      });
      vkGamma2.add(CSL.PlutusData.new_list(vkList));
    });
    fields.add(CSL.PlutusData.new_list(vkGamma2));

    const vkDelta2 = CSL.PlutusList.new();
    this.vkDelta2.forEach((vk) => {
      const vkList = CSL.PlutusList.new();
      vk.forEach((vkElem) => {
        vkList.add(
          CSL.PlutusData.new_integer(CSL.BigInt.from_str(vkElem.toString()))
        );
      });
      vkDelta2.add(CSL.PlutusData.new_list(vkList));
    });
    fields.add(CSL.PlutusData.new_list(vkDelta2));

    const vkAlphabeta12 = CSL.PlutusList.new();
    this.vkAlphabeta12.forEach((vk) => {
      const vkList = CSL.PlutusList.new();
      vk.forEach((vkElem) => {
        const vkElemList = CSL.PlutusList.new();
        vkElem.forEach((vkElemElem) => {
          vkElemList.add(
            CSL.PlutusData.new_integer(
              CSL.BigInt.from_str(vkElemElem.toString())
            )
          );
        });
        vkList.add(CSL.PlutusData.new_list(vkElemList));
      });
      vkAlphabeta12.add(CSL.PlutusData.new_list(vkList));
    });
    fields.add(CSL.PlutusData.new_list(vkAlphabeta12));

    const ic = CSL.PlutusList.new();
    this.ic.forEach((icElem) => {
      const icElemList = CSL.PlutusList.new();
      icElem.forEach((icElemElem) => {
        icElemList.add(
          CSL.PlutusData.new_integer(CSL.BigInt.from_str(icElemElem.toString()))
        );
      });
      ic.add(CSL.PlutusData.new_list(icElemList));
    });
    fields.add(CSL.PlutusData.new_list(ic));

    const piA = CSL.PlutusList.new();
    this.piA.forEach((piAElem) => {
      piA.add(
        CSL.PlutusData.new_integer(CSL.BigInt.from_str(piAElem.toString()))
      );
    });
    fields.add(CSL.PlutusData.new_list(piA));

    const piB = CSL.PlutusList.new();
    this.piB.forEach((piBElem) => {
      const piBElemList = CSL.PlutusList.new();
      piBElem.forEach((piBElemElem) => {
        piBElemList.add(
          CSL.PlutusData.new_integer(
            CSL.BigInt.from_str(piBElemElem.toString())
          )
        );
      });
      piB.add(CSL.PlutusData.new_list(piBElemList));
    });
    fields.add(CSL.PlutusData.new_list(piB));

    const piC = CSL.PlutusList.new();
    this.piC.forEach((piC1Elem) => {
      piC.add(
        CSL.PlutusData.new_integer(CSL.BigInt.from_str(piC1Elem.toString()))
      );
    });
    fields.add(CSL.PlutusData.new_list(piC));

    const result = CSL.PlutusData.new_constr_plutus_data(
      CSL.ConstrPlutusData.new(CSL.BigNum.from_str("0"), fields)
    );

    result;

    return result;
  }

  public static fromCsl(datum: CSL.PlutusData) {
    const result: MastermindDatum = {} as MastermindDatum;

    const cto = datum.as_constr_plutus_data()!;

    const fields = cto.data();

    result.codeMaster = Buffer.from(fields.get(0)!.as_bytes()!).toString("hex");
    result.codeBreaker = Buffer.from(fields.get(1)!.as_bytes()!).toString(
      "hex"
    );
    result.hashSol = BigInt(fields.get(2)!.as_integer()!.to_str());

    const guesses = [];
    for (var i = 0; i < fields.get(3)!.as_list()!.len(); i++) {
      guesses.push(
        Number(fields.get(3)!.as_list()!.get(i)!.as_integer()!.to_str())
      );
    }
    result.guesses = guesses;

    result.blackPegs = Number(fields.get(4)!.as_integer()!.to_str());
    result.whitePegs = Number(fields.get(5)!.as_integer()!.to_str());
    result.currentTurn = Number(fields.get(6)!.as_integer()!.to_str());
    result.nPublic = Number(fields.get(7)!.as_integer()!.to_str());

    const vkAlpha1 = [];
    for (var i = 0; i < fields.get(8)!.as_list()!.len(); i++) {
      vkAlpha1.push(
        BigInt(fields.get(8)!.as_list()!.get(i)!.as_integer()!.to_str())
      );
    }
    result.vkAlpha1 = vkAlpha1;

    const vkBeta2 = [];
    for (var i = 0; i < fields.get(9)!.as_list()!.len(); i++) {
      const vkBeta2Elem = [];
      for (
        var j = 0;
        j < fields.get(9)!.as_list()!.get(i)!.as_list()!.len();
        j++
      ) {
        vkBeta2Elem.push(
          BigInt(
            fields
              .get(9)!
              .as_list()!
              .get(i)!
              .as_list()!
              .get(j)!
              .as_integer()!
              .to_str()
          )
        );
      }
      vkBeta2.push(vkBeta2Elem);
    }
    result.vkBeta2 = vkBeta2;

    const vkGamma2 = [];
    for (var i = 0; i < fields.get(10)!.as_list()!.len(); i++) {
      const vkGamma2Elem = [];
      for (
        var j = 0;
        j < fields.get(10)!.as_list()!.get(i)!.as_list()!.len();
        j++
      ) {
        vkGamma2Elem.push(
          BigInt(
            fields
              .get(10)!
              .as_list()!
              .get(i)!
              .as_list()!
              .get(j)!
              .as_integer()!
              .to_str()
          )
        );
      }
      vkGamma2.push(vkGamma2Elem);
    }
    result.vkGamma2 = vkGamma2;

    const vkDelta2 = [];
    for (var i = 0; i < fields.get(11)!.as_list()!.len(); i++) {
      const vkDelta2Elem = [];
      for (
        var j = 0;
        j < fields.get(11)!.as_list()!.get(i)!.as_list()!.len();
        j++
      ) {
        vkDelta2Elem.push(
          BigInt(
            fields
              .get(11)!
              .as_list()!
              .get(i)!
              .as_list()!
              .get(j)!
              .as_integer()!
              .to_str()
          )
        );
      }
      vkDelta2.push(vkDelta2Elem);
    }
    result.vkDelta2 = vkDelta2;

    const vkAlphabeta12 = [];
    for (var i = 0; i < fields.get(12)!.as_list()!.len(); i++) {
      const vkAlphabeta12Elem = [];
      for (
        var j = 0;
        j < fields.get(12)!.as_list()!.get(i)!.as_list()!.len();
        j++
      ) {
        const vkAlphabeta12ElemElem = [];
        for (
          var k = 0;
          k <
          fields
            .get(12)!
            .as_list()!
            .get(i)!
            .as_list()!
            .get(j)!
            .as_list()!
            .len();
          k++
        ) {
          vkAlphabeta12ElemElem.push(
            BigInt(
              fields
                .get(12)!
                .as_list()!
                .get(i)!
                .as_list()!
                .get(j)!
                .as_list()!
                .get(k)!
                .as_integer()!
                .to_str()
            )
          );
        }
        vkAlphabeta12Elem.push(vkAlphabeta12ElemElem);
      }
      vkAlphabeta12.push(vkAlphabeta12Elem);
    }
    result.vkAlphabeta12 = vkAlphabeta12;

    const ic = [];
    for (var i = 0; i < fields.get(13)!.as_list()!.len(); i++) {
      const icElem = [];
      for (
        var j = 0;
        j < fields.get(13)!.as_list()!.get(i)!.as_list()!.len();
        j++
      ) {
        icElem.push(
          BigInt(
            fields
              .get(13)!
              .as_list()!
              .get(i)!
              .as_list()!
              .get(j)!
              .as_integer()!
              .to_str()
          )
        );
      }
      ic.push(icElem);
    }
    result.ic = ic;

    const piA = [];
    for (var i = 0; i < fields.get(14)!.as_list()!.len(); i++) {
      piA.push(
        BigInt(fields.get(14)!.as_list()!.get(i)!.as_integer()!.to_str())
      );
    }
    result.piA = piA;

    const piB = [];
    for (var i = 0; i < fields.get(15)!.as_list()!.len(); i++) {
      const piBElem = [];
      for (
        var j = 0;
        j < fields.get(15)!.as_list()!.get(i)!.as_list()!.len();
        j++
      ) {
        piBElem.push(
          BigInt(
            fields
              .get(15)!
              .as_list()!
              .get(i)!
              .as_list()!
              .get(j)!
              .as_integer()!
              .to_str()
          )
        );
      }
      piB.push(piBElem);
    }
    result.piB = piB;

    const piC = [];
    for (var i = 0; i < fields.get(16)!.as_list()!.len(); i++) {
      piC.push(
        BigInt(fields.get(16)!.as_list()!.get(i)!.as_integer()!.to_str())
      );
    }
    result.piC = piC;

    return new MastermindDatum(
      result.codeMaster,
      result.codeBreaker,
      result.hashSol,
      result.guesses,
      result.blackPegs,
      result.whitePegs,
      result.currentTurn,
      result.nPublic,
      result.vkAlpha1,
      result.vkBeta2,
      result.vkGamma2,
      result.vkDelta2,
      result.vkAlphabeta12,
      result.ic,
      result.piA,
      result.piB,
      result.piC
    );
  }

  public copy() {
    return new MastermindDatum(
      this.codeMaster,
      this.codeBreaker,
      this.hashSol,
      this.guesses,
      this.blackPegs,
      this.whitePegs,
      this.currentTurn,
      this.nPublic,
      this.vkAlpha1,
      this.vkBeta2,
      this.vkGamma2,
      this.vkDelta2,
      this.vkAlphabeta12,
      this.ic,
      this.piA,
      this.piB,
      this.piC
    );
  }

  public async calculateProof(secretCode: Array<number>, secretHash: string) {
    const { proof, publicSignals }: any = await getProof(
      this,
      secretCode,
      secretHash
    );
    this.setProof(proof, publicSignals);
  }

  public getSnarkjsProof() {
    const result: any = {};
    result["protocol"] = "groth16";
    result["curve"] = "bn128";
    result["pi_a"] = this.piA.map((x) => x.toString());
    result["pi_b"] = this.piB.map((x) => x.map((y) => y.toString()));
    result["pi_c"] = this.piC.map((x) => x.toString());

    return result;
  }

  public getSnarkjsPublicSignals() {
    return [
      this.hashSol.toString(),
      this.guesses[0].toString(),
      this.guesses[1].toString(),
      this.guesses[2].toString(),
      this.guesses[3].toString(),
      this.blackPegs.toString(),
      this.whitePegs.toString(),
      this.hashSol.toString(),
    ];
  }
}

export const startRedeemerMesh: Data = { alternative: 0, fields: [] };
export const clueRedeemerMesh: Data = { alternative: 1, fields: [] };
export const endRedeemerMesh: Data = { alternative: 2, fields: [] };
export const guessRedeemerMesh: Data = { alternative: 3, fields: [] };

async function getProof(
  datum: MastermindDatum,
  secretCode: Array<number>,
  secretHash: string
) {
  const secretCodeIndex = secretCode;
  const secretCodeNumber = BigInt(secretCodeIndex.join(""));
  const secretCodeHashDec = BigInt(parseInt(secretHash, 16));

  const saltedSolution = secretCodeNumber + secretCodeHashDec;

  const pedersen = await circomlibjs.buildPedersenHash();
  const babyJub = await circomlibjs.buildBabyjub();
  const F = babyJub.F;

  const publicHash = pedersen.hash(bigintBuffer.toBufferLE(saltedSolution, 32));
  const publicHashUnpacked = babyJub.unpackPoint(publicHash);

  try {
    const inputs = {
      pubNumBlacks: datum.blackPegs,
      pubNumWhites: datum.whitePegs,
      pubSolnHash: F.toObject(publicHashUnpacked[0]),
      privSaltedSoln: saltedSolution,
      pubGuessA: datum.guesses[0],
      pubGuessB: datum.guesses[1],
      pubGuessC: datum.guesses[2],
      pubGuessD: datum.guesses[3],
      privSolnA: secretCodeIndex[0],
      privSolnB: secretCodeIndex[1],
      privSolnC: secretCodeIndex[2],
      privSolnD: secretCodeIndex[3],
    };
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      inputs,
      "/mastermind.wasm",
      "/mastermind.pk"
    );
    console.log("Proof: ", proof);
    console.log("Public signals: ", publicSignals);
    return { proof, publicSignals };
  } catch (e) {
    throw new Error("Not proof");
  }
}

function leInt2Buff(n: bigint, len: number) {
  let r = n;
  let o = 0;
  const buff = Buffer.alloc(len);
  while (r > BigInt(0) && o < len) {
    let c = r & BigInt(0xff);
    r = r >> BigInt(8);
    buff[o] = Number(c);
    o++;
  }
  if (r > BigInt(0)) {
    throw new Error("byte length overflow");
  }

  return buff;
}
