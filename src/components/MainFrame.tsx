import React, { useCallback, useContext, useState } from "react";
import { Box, Button, Typography } from "@material-ui/core";
import { ethers } from "ethers";

import ContractsContext from "../contexts/Contracts";
import MeContext from "../contexts/Me";
// import frame from "../public/img/frame.png";
import usePoller from "../hooks/Poller";

import Spinner from "./Spinner";

type Data = {
  address: string;
  order: number;
};

type Optional<T> = T | undefined | null;

type UnwrapButtonProps = {
  normalUnwrap: () => Promise<void>;
  stolenUnwrap: () => Promise<void>;
  useStolenUnwrap: boolean;
};

const UnwrapButton: React.FC<UnwrapButtonProps> = ({
  normalUnwrap,
  stolenUnwrap,
  useStolenUnwrap,
}) => {
  const handleUnwrap = useCallback(async () => {
    if (useStolenUnwrap) {
      return await stolenUnwrap();
    }
    return await normalUnwrap();
  }, [normalUnwrap, stolenUnwrap, useStolenUnwrap]);

  return (
    <Button variant="outlined" onClick={handleUnwrap}>
      Unwrap
    </Button>
  );
};

const Table = () => {
  const { whiteElephant } = useContext(ContractsContext);
  const [data, setData] = useState<Data[]>([]);
  const [currTurn, setCurrTurn] = useState<number>(-1);

  const handleData = useCallback(async () => {
    const { contract } = whiteElephant;
    if (!contract) return;

    const totalNumPlayers = await contract.numberOfPlayers();

    const allPlayers: Data[] = [];
    for (let i = 0; i < totalNumPlayers; i++) {
      const player = await contract.getPlayerNumber(i);
      allPlayers.push({ address: player, order: i + 1 });
    }

    setData(allPlayers);
  }, [whiteElephant]);

  const handleTurn = useCallback(async () => {
    const { contract } = whiteElephant;
    if (!contract) return;

    const __currTurn = await contract.currNftToUnwrap();
    let _currTurn = -1;
    try {
      _currTurn = Number(__currTurn);
    } catch (err) {
      console.warn("could not get my order number");
    }

    setCurrTurn(_currTurn);
  }, [whiteElephant]);

  const handleTableData = useCallback(async () => {
    await Promise.all([handleData(), handleTurn()]);
  }, [handleData, handleTurn]);

  usePoller(handleTableData, 3000);

  if (data.length < 1) return <></>;

  return (
    <table style={{ margin: "auto" }}>
      <thead>
        <tr>
          <th>Address</th>
          <th>Turn</th>
        </tr>
      </thead>
      <tbody>
        {data &&
          data.map((d) => (
            <tr
              key={`${d.address}::${d.order}`}
              style={{ background: currTurn === d.order - 1 ? "green" : "" }}
            >
              <td>{d.address}</td>
              <td>{d.order}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
};

const MainFrame: React.FC = () => {
  const { whiteElephant } = useContext(ContractsContext);
  const {
    prize,
    isLoadingPrize,
    enableCheckingPrize,
    getPrizeInfo,
  } = useContext(MeContext);
  const [error, setError] = useState<string>("");

  const unwrap = useCallback(async () => {
    const { contract } = whiteElephant;
    if (!contract) return;
    try {
      const tx = await contract.unwrap();
      await tx.wait(1);
      enableCheckingPrize();
      await getPrizeInfo();
    } catch (err) {
      setError(err?.data?.message || "unknown");
    }
  }, [enableCheckingPrize, getPrizeInfo, whiteElephant]);

  const stolenUnwrap = useCallback(async () => {
    const { contract } = whiteElephant;
    if (!contract) return;
    try {
      const tx = await contract.unwrapAfterSteal();
      await tx.wait(1);
      enableCheckingPrize();
      await getPrizeInfo();
    } catch (err) {
      setError(err?.data?.message || "unknown");
    }
  }, [enableCheckingPrize, getPrizeInfo, whiteElephant]);

  return (
    <Box>
      <Box style={{ marginBottom: "4em" }}>
        <Typography variant="h2">Thy Prize</Typography>
      </Box>
      <Box style={{ position: "relative" }}>
        {/* <img src={frame} alt="painting frame" /> */}
        {isLoadingPrize && (
          <Box style={{ position: "absolute", top: "25%", left: "50%" }}>
            <Spinner />
          </Box>
        )}
        {prize.tokenId !== -1 && prize.media && (
          <img
            src={URL.createObjectURL(prize.media)}
            alt="lol"
            style={{ maxWidth: "300px", maxHeight: "300px" }}
          />
        )}
      </Box>
      {prize.nft !== ethers.constants.AddressZero && prize.tokenId !== -1 && (
        <Box style={{ marginTop: "2em" }}>
          <Typography>NFT Address: {prize.nft}</Typography>
          <Typography>
            Token id:{" "}
            <a
              href={`https://goerli.etherscan.io/token/${prize.nft}?a=${prize.tokenId}`}
            >
              {prize.tokenId}
            </a>
          </Typography>
        </Box>
      )}
      <Box style={{ marginTop: "2em" }}>
        {error && (
          <Typography style={{ fontWeight: "bold", color: "red" }}>
            {error}
          </Typography>
        )}
        <Box style={{ marginTop: "2em" }}>
          {prize.iWasStolenFrom && prize.nft === ethers.constants.AddressZero && (
            <Box>
              <Typography>Oh oh, someone naughty stole from you</Typography>
              <Typography>Go ahead, unwrap or steal</Typography>
              <Typography>Now, noone will be able to steal from you</Typography>
            </Box>
          )}
          {prize.tokenId === -1 && (
            <Box style={{ marginTop: "2em" }}>
              <UnwrapButton
                normalUnwrap={unwrap}
                stolenUnwrap={stolenUnwrap}
                useStolenUnwrap={
                  prize.iWasStolenFrom &&
                  prize.nft === ethers.constants.AddressZero
                }
              />
            </Box>
          )}
        </Box>
      </Box>
      <Box style={{ marginTop: "4em", textAlign: "center" }}>
        <Typography variant="h6" style={{ fontWeight: "bold" }}>
          There shall-eth be order-eth
        </Typography>
        <Box style={{ margin: "2em" }}>
          <Table />
        </Box>
      </Box>
    </Box>
  );
};

export default MainFrame;
