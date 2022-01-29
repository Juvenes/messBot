from binance.client import Client
import pandas as pd
import ta
import matplotlib.pyplot as plt
import numpy as np
import sys
import warnings
warnings.filterwarnings("ignore")



ftxClassicPair = [
        "BTC/USD",
        "ETH/USD",
        "LINK/USD",
        "TRX/USD",
        "BCH/USD",
        "FTM/USD",
        "MANA/USD",
        "CHZ/USD",
        "AVAX/USD"]

bullrun = ["27 june 2021", "20 november 2021"]
crashrun = ["20 october 2021", "26 january 2022"]
longrun = ["01 january 2021", "26 january 2022"]

client = Client()
def getInfos(pair,start,end):
    # -- Ameliorable en memorisant les bougies ! --
    pairName = pair
    startDate = start
    EndDate = end
    timeInterval = Client.KLINE_INTERVAL_1HOUR

    # -- Load all price data from binance API --
    klinesT = client.get_historical_klines(pairName, timeInterval,startDate,EndDate)

    # -- Define your dataset --
    df = pd.DataFrame(klinesT, columns = ['timestamp', 'open', 'high', 'low', 'close', 'volume', 'close_time', 'quote_av', 'trades', 'tb_base_av', 'tb_quote_av', 'ignore' ])
    df['close'] = pd.to_numeric(df['close'])
    df['high'] = pd.to_numeric(df['high'])
    df['low'] = pd.to_numeric(df['low'])
    df['open'] = pd.to_numeric(df['open'])

    # -- Set the date to index --
    df = df.set_index(df['timestamp'])
    df.index = pd.to_datetime(df.index, unit='ms')
    del df['timestamp']
    df.drop(df.columns.difference(['open','high','low','close','volume']), 1, inplace=True)
    return df
def trixAddIndicate(df):
    df['EMA200'] = ta.trend.ema_indicator(close=df['close'], window=200)
    trixLength = 9
    trixSignal = 21
    df['TRIX'] = ta.trend.ema_indicator(ta.trend.ema_indicator(ta.trend.ema_indicator(close=df['close'], window=trixLength), window=trixLength), window=trixLength)
    df['TRIX_PCT'] = df["TRIX"].pct_change()*100
    df['TRIX_SIGNAL'] = ta.trend.sma_indicator(df['TRIX_PCT'],trixSignal)
    df['TRIX_HISTO'] = df['TRIX_PCT'] - df['TRIX_SIGNAL']
    df['STOCH_RSI'] = ta.momentum.stochrsi(close=df['close'], window=14, smooth1=3, smooth2=3)
    return df




class BackTrick:
    def __init__(self):
        self.usdt = 1000
        self.makerFee = 0.0002
        self.takerFee = 0.0007
        # -- Do not touch these values --
        self.initalWallet = self.usdt
        self.wallet = self.usdt
        self.coin = 0
        self.lastAth = 0
        self.stopLoss = 0
        self.takeProfit = 500000
        self.buyReady = True
        self.sellReady = True
        self.dt = pd.DataFrame(columns = ['date','position', 'reason', 'price', 'frais' ,'fiat', 'coins', 'wallet', 'drawBack'])
     # -- Condition to BUY market --
    def buyCondition(self ,row):
        if row['TRIX_HISTO'] > 0 and row['STOCH_RSI'] < 0.8:
            return True
        else:
            return False

    # -- Condition to SELL market --  
    def sellCondition(self ,row):
        if row['TRIX_HISTO'] < 0 and row['STOCH_RSI'] > 0.2:
            return True
        else:
            return False
    def runBackTrix(self,df,pair):
        dfTest = df.copy()
        for index, row in dfTest.iterrows():
            # -- Buy market order --
            if self.buyCondition(row) and self.usdt > 0 and self.buyReady == True:
                buyPrice = row['close']
                self.coin = self.usdt / buyPrice
                fee = self.takerFee * self.coin
                self.coin = self.coin - fee
                self.usdt = 0
                self.wallet = self.coin * row['close']
                if self.wallet > self.lastAth:
                    self.lastAth = self.wallet
                myrow = {'date': index, 'position': "Buy", 'reason':'Buy Market Order','price': buyPrice,'frais': fee * row['close'],'fiat': self.usdt,'coins': self.coin,'wallet': self.wallet,'drawBack':(self.wallet-self.lastAth)/self.lastAth}
                self.dt = self.dt.append(myrow,ignore_index=True)
            elif row['low'] < self.stopLoss and self.coin > 0:
                sellPrice = self.stopLoss
                self.usdt = self.coin * sellPrice
                fee = self.makerFee * self.usdt
                self.usdt = self.usdt - fee
                self.coin = 0
                self.buyReady = False
                self.wallet = self.usdt

                # -- Check if your wallet hit a new ATH to know the drawBack --
                if self.wallet > self.lastAth:
                    self.lastAth = self.wallet
                
                # -- You can uncomment the line below if you want to see logs --
                # a += "Sell COIN at Stop Loss",sellPrice,'$ the', index)

                # -- Add the trade to DT to analyse it later --
                myrow = {'date': index,'position': "Sell", 'reason':'Sell Stop Loss','price': sellPrice,'frais': fee,'fiat': self.usdt,'coins': self.coin,'wallet': self.wallet,'drawBack':(self.wallet-self.lastAth)/self.lastAth}
                self.dt = self.dt.append(myrow,ignore_index=True)    

            # -- Sell Market Order --
            elif self.sellCondition(row) and self.coin > 0 and self.sellReady == True:

                # -- You can define here at what price you buy --
                sellPrice = row['close']
                self.usdt = self.coin * sellPrice
                fee = self.takerFee * self.usdt
                self.usdt = self.usdt - fee
                self.coin = 0
                self.buyReady = True
                self.wallet = self.usdt

                # -- Check if your wallet hit a new ATH to know the drawBack --
                if self.wallet > self.lastAth:
                    self.lastAth = self.wallet

                # -- You can uncomment the line below if you want to see logs --  
                # a += "Sell COIN at",sellPrice,'$ the', index)

                # -- Add the trade to DT to analyse it later --
                myrow = {'date': index,'position': "Sell", 'reason':'Sell Market Order','price': sellPrice,'frais': fee,'fiat': self.usdt,'coins': self.coin,'wallet': self.wallet,'drawBack':(self.wallet-self.lastAth)/self.lastAth}
                self.dt = self.dt.append(myrow,ignore_index=True)
            
        # -- BackTest Analyses --
        self.dt = self.dt.set_index(self.dt['date'])
        self.dt.index = pd.to_datetime(self.dt.index)
        self.dt['resultat'] = self.dt['wallet'].diff()
        self.dt['resultat%'] = self.dt['wallet'].pct_change()*100
        self.dt.loc[self.dt['position']=='Buy','resultat'] = None
        self.dt.loc[self.dt['position']=='Buy','resultat%'] = None

        self.dt['tradeIs'] = ''
        self.dt.loc[self.dt['resultat']>0,'tradeIs'] = 'Good'
        self.dt.loc[self.dt['resultat']<=0,'tradeIs'] = 'Bad'
        iniClose = dfTest.iloc[0]['close']
        lastClose = dfTest.iloc[len(dfTest)-1]['close']
        holdPercentage = ((lastClose - iniClose)/iniClose) * 100
        algoPercentage = ((self.wallet - self.initalWallet)/self.initalWallet) * 100
        vsHoldPercentage = ((algoPercentage - holdPercentage)/holdPercentage) * 100

        try:
            tradesPerformance = round(self.dt.loc[(self.dt['tradeIs'] == 'Good') | (self.dt['tradeIs'] == 'Bad'), 'resultat%'].sum()
                    / self.dt.loc[(self.dt['tradeIs'] == 'Good') | (self.dt['tradeIs'] == 'Bad'), 'resultat%'].count(), 2)
        except:
            tradesPerformance = 0

        try:
            totalGoodTrades = self.dt.groupby('tradeIs')['date'].nunique()['Good']
            AveragePercentagePositivTrades = round(self.dt.loc[self.dt['tradeIs'] == 'Good', 'resultat%'].sum()
                                                / self.dt.loc[self.dt['tradeIs'] == 'Good', 'resultat%'].count(), 2)
            idbest = self.dt.loc[self.dt['tradeIs'] == 'Good', 'resultat%'].idxmax()
            bestTrade = str(
                round(self.dt.loc[self.dt['tradeIs'] == 'Good', 'resultat%'].max(), 2))
        except:
            totalGoodTrades = 0
            AveragePercentagePositivTrades = 0
            idbest = ''
            bestTrade = 0

        try:
            totalBadTrades = self.dt.groupby('tradeIs')['date'].nunique()['Bad']
            AveragePercentageNegativTrades = round(self.dt.loc[self.dt['tradeIs'] == 'Bad', 'resultat%'].sum()
                                                / self.dt.loc[self.dt['tradeIs'] == 'Bad', 'resultat%'].count(), 2)
            idworst = self.dt.loc[self.dt['tradeIs'] == 'Bad', 'resultat%'].idxmin()
            worstTrade = round(self.dt.loc[self.dt['tradeIs'] == 'Bad', 'resultat%'].min(), 2)
        except:
            totalBadTrades = 0
            AveragePercentageNegativTrades = 0
            idworst = ''
            worstTrade = 0

        totalTrades = totalBadTrades + totalGoodTrades
        winRateRatio = (totalGoodTrades/totalTrades) * 100
        reasons = self.dt['reason'].unique()
        a = ""
        a += "\nPair Symbol :" +pair
        a += "\nPeriod : [" + str(dfTest.index[0]) + "] -> [" + str(dfTest.index[len(dfTest)-1]) + "]"
        a += "\nStarting balance :" + str(self.initalWallet) + "$"

        a += "\n\n----- General Informations -----"
        a += "\nFinal balance :"+ str(round(self.wallet, 2))+ "$"
        a += "\nPerformance vs US Dollar :"+ str(round(algoPercentage, 2))+ "%"
        a += "\nBuy and Hold Performence :"+ str(round(holdPercentage, 2))+ "%"
        a += "\nPerformance vs Buy and Hold :"+ str(round(vsHoldPercentage, 2))+ "%"
        a += "\nBest trade : +"+str(bestTrade)+ "%, the"+ str(idbest)
        a += "\nWorst trade :"+str( worstTrade)+ "%, the"+ str(idworst)
        a += "\nWorst drawBack :"+ str(100*round(self.dt['drawBack'].min(), 2))+ "%"
        a += "\nTotal fees : "+ str(round(self.dt['frais'].sum(), 2))+ "$"
        a += "\n\n----- Trades Informations -----"
        a += "\nTotal trades on period :"+str(totalTrades)
        a += "\nNumber of positive trades :"+ str(totalGoodTrades)
        a += "\nNumber of negative trades : "+ str(totalBadTrades)
        a += "\nTrades win rate ratio :"+ str(round(winRateRatio, 2))+ '%'
        a += "\nAverage trades performance :"+str(tradesPerformance)+"%"
        a += "\nAverage positive trades :"+ str(AveragePercentagePositivTrades)+ "%"
        a += "\nAverage negative trades :"+ str(AveragePercentageNegativTrades)+"%"

        a += "\n\n----- Trades Reasons -----"
        reasons = self.dt['reason'].unique()
        for r in reasons:
            a += "\n"+str(r)+" number :"+ str(self.dt.groupby('reason')['date'].nunique()[r])
        print(a)

def main():
    StartDate = "01 january 2021"
    EndDate = "26 january 2022"
    coin = sys.argv[1]
    if (sys.argv[2] =="BULLRUN"):
        StartDate = "27 june 2021"
        EndDate = "20 november 2021"
    if (sys.argv[2]=="CRASHRUN"):
        StartDate = "20 october 2021"
        EndDate = "26 january 2022"
    if(sys.argv[3]== "TRIX"):
        dt = getInfos(coin,StartDate, EndDate)
        df = trixAddIndicate(dt)
        back_trix=  BackTrick()
        back_trix.runBackTrix(df,coin)

if __name__ == '__main__':
    main()