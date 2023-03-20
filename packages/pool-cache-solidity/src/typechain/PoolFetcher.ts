/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumberish,
  BytesLike,
  FunctionFragment,
  Result,
  Interface,
  AddressLike,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedListener,
  TypedContractMethod,
} from "./common";

export type TokenPairStruct = { tokenA: AddressLike; tokenB: AddressLike };

export type TokenPairStructOutput = [tokenA: string, tokenB: string] & {
  tokenA: string;
  tokenB: string;
};

export type UniswapV3PoolStruct = {
  fee: BigNumberish;
  poolAddress: AddressLike;
  totalValueInToken1: BigNumberish;
};

export type UniswapV3PoolStructOutput = [
  fee: bigint,
  poolAddress: string,
  totalValueInToken1: bigint
] & { fee: bigint; poolAddress: string; totalValueInToken1: bigint };

export interface PoolFetcherInterface extends Interface {
  getFunction(
    nameOrSignature: "batchFetch" | "getPools" | "uniV3Factory"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "batchFetch",
    values: [TokenPairStruct[]]
  ): string;
  encodeFunctionData(
    functionFragment: "getPools",
    values: [AddressLike, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "uniV3Factory",
    values?: undefined
  ): string;

  decodeFunctionResult(functionFragment: "batchFetch", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getPools", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "uniV3Factory",
    data: BytesLike
  ): Result;
}

export interface PoolFetcher extends BaseContract {
  connect(runner?: ContractRunner | null): BaseContract;
  attach(addressOrName: AddressLike): this;
  deployed(): Promise<this>;

  interface: PoolFetcherInterface;

  queryFilter<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;
  queryFilter<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;

  on<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  on<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  once<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  once<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  listeners<TCEvent extends TypedContractEvent>(
    event: TCEvent
  ): Promise<Array<TypedListener<TCEvent>>>;
  listeners(eventName?: string): Promise<Array<Listener>>;
  removeAllListeners<TCEvent extends TypedContractEvent>(
    event?: TCEvent
  ): Promise<this>;

  batchFetch: TypedContractMethod<
    [pairs: TokenPairStruct[]],
    [UniswapV3PoolStructOutput[]],
    "view"
  >;

  getPools: TypedContractMethod<
    [tokenA: AddressLike, tokenB: AddressLike],
    [UniswapV3PoolStructOutput[]],
    "view"
  >;

  uniV3Factory: TypedContractMethod<[], [string], "view">;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "batchFetch"
  ): TypedContractMethod<
    [pairs: TokenPairStruct[]],
    [UniswapV3PoolStructOutput[]],
    "view"
  >;
  getFunction(
    nameOrSignature: "getPools"
  ): TypedContractMethod<
    [tokenA: AddressLike, tokenB: AddressLike],
    [UniswapV3PoolStructOutput[]],
    "view"
  >;
  getFunction(
    nameOrSignature: "uniV3Factory"
  ): TypedContractMethod<[], [string], "view">;

  filters: {};
}
